const PASSWORD = "This wouldn't be necessary if you hadn't checked the source";

async function loadPuzzle() {
    const res = await fetch("puzzle_encrypted.json");
    const enc = await res.json();

    const bytes = CryptoJS.AES.decrypt(enc.data, PASSWORD);
    const jsonStr = bytes.toString(CryptoJS.enc.Utf8);

    if (!jsonStr) {
        console.error("復号に失敗しました。パスワードが一致していません。");
        return null;
    }

    return JSON.parse(jsonStr);
}


/* ============================================================
   QWERTY キーボード生成
============================================================ */
function renderKeyboard(onKeyPress) {
    const kb = document.getElementById("keyboard");
    kb.innerHTML = "";

    // 10列グリッドに流し込む
    const keys = [
        // 1段目（10キー）
        "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P",

        // 2段目（A を半キー右へ → 空白1つ入れる）
        "A", "S", "D", "F", "G", "H", "J", "K", "L", "",

        // 3段目（Z を1.8キー右へ → 空白2つ入れる）
        "Z", "X", "C", "V", "B", "N", "M", "←"
    ];

    keys.forEach(k => {
        const div = document.createElement("div");

        if (k === "") {
            div.className = "empty";  // 空白セル
        } else if (k === "←") {
            div.className = "key special";
            div.innerText = "←";
            div.addEventListener("click", () => onKeyPress("BACK"));
        } else {
            div.className = "key";
            div.innerText = k;
            div.addEventListener("click", () => onKeyPress(k));
        }

        kb.appendChild(div);
    });
}





/* ============================================================
   Crossword クラス
============================================================ */
class Crossword {
    constructor(data) {
        this.data = data;
        this.cells = [];
        this.numbers = [];
        this.direction = "across";
        this.currentPos = null;
    }

    render(targetId) {
        const target = document.getElementById(targetId);
        const table = document.createElement("table");

        const rows = this.data.size[0];
        const cols = this.data.size[1];

        this.numbers = Array.from({ length: rows }, () => Array(cols).fill(null));
        let counter = 1;

        this.cells = [];

        for (let r = 0; r < rows; r++) {
            const row = document.createElement("tr");
            this.cells[r] = [];

            for (let c = 0; c < cols; c++) {
                const cell = document.createElement("td");
                cell.className = "cell";

                const isBlack = this.data.grid[r][c] === ".";
                if (isBlack) {
                    cell.classList.add("black");

                    const inner = document.createElement("div");
                    inner.className = "cell-inner black-inner"; // ← 追加
                    cell.appendChild(inner);
                } else {
                    const inner = document.createElement("div");
                    inner.className = "cell-inner";
                    cell.appendChild(inner);

                    const startAcross =
                        (c === 0 || this.data.grid[r][c - 1] === ".") &&
                        (c < cols - 1 && this.data.grid[r][c + 1] !== ".");

                    const startDown =
                        (r === 0 || this.data.grid[r - 1][c] === ".") &&
                        (r < rows - 1 && this.data.grid[r + 1][c] !== ".");

                    if (startAcross || startDown) {
                        this.numbers[r][c] = counter;

                        const numDiv = document.createElement("div");
                        numDiv.className = "number";
                        numDiv.innerText = counter;

                        // ★ cell ではなく inner に入れる
                        inner.appendChild(numDiv);

                        counter++;
                    }

                    const input = document.createElement("div");
                    input.className = "letter";
                    input.innerText = "";   // 文字はここに入れる

                    // ★ input も inner に入れる
                    inner.appendChild(input);
                    this.cells[r][c] = input;
                }

                row.appendChild(cell);
            }
            table.appendChild(row);
        }

        target.appendChild(table);

        this.renderClues();
        this.addCellEvents();
    }

    renderClues() {
        const cluesDiv = document.getElementById("clues");
        cluesDiv.innerHTML = "";

        const acrossTitle = document.createElement("h3");
        acrossTitle.innerText = "横（Across）";
        cluesDiv.appendChild(acrossTitle);

        const acrossList = document.createElement("ul");

        for (const item of this.data.clues.across) {
            const [r, c] = item.pos;
            const num = this.numbers[r][c];
            const li = document.createElement("li");
            li.innerText = `${num}. ${item.clue}`;
            acrossList.appendChild(li);
        }

        cluesDiv.appendChild(acrossList);

        const downTitle = document.createElement("h3");
        downTitle.innerText = "縦（Down）";
        cluesDiv.appendChild(downTitle);

        const downList = document.createElement("ul");

        for (const item of this.data.clues.down) {
            const [r, c] = item.pos;
            const num = this.numbers[r][c];
            const li = document.createElement("li");
            li.innerText = `${num}. ${item.clue}`;
            downList.appendChild(li);
        }

        cluesDiv.appendChild(downList);
    }

    addCellEvents() {
        for (let r = 0; r < this.data.size[0]; r++) {
            for (let c = 0; c < this.data.size[1]; c++) {
                const input = this.cells[r][c];
                if (!input) continue;

                input.addEventListener("click", () => {
                    this.onCellClick(r, c);
                });
            }
        }
    }

    onCellClick(r, c) {

        const isAcross = this.isAcrossCell(r, c);
        const isDown = this.isDownCell(r, c);

        // 黒マスなど → 無視
        if (!isAcross && !isDown) {
            this.currentPos = null;
            return;
        }

        /* ============================================================
           ★ すでに currentPos があり、同じマスをクリックした場合
        ============================================================ */
        if (this.currentPos && this.currentPos.r === r && this.currentPos.c === c) {

            if (isAcross && isDown) {
                this.direction = (this.direction === "across") ? "down" : "across";
            }

            document.querySelectorAll(".active").forEach(el => el.classList.remove("active"));
            this.cells[r][c].closest("td").classList.add("current");
            this.highlightWord(r, c);

            // ★ ヒント更新を追加
            this.updateCurrentClue(r, c);

            return;
        }

        /* ============================================================
           ① キーワード未選択状態（currentPos が null）
        ============================================================ */
        if (!this.currentPos) {

            // 横＋縦 → 横優先
            if (isAcross && isDown) {
                this.direction = "across";
            }
            else if (isAcross) {
                this.direction = "across";
            }
            else {
                this.direction = "down";
            }

            // current 更新
            document.querySelectorAll(".current").forEach(el => el.classList.remove("current"));
            this.currentPos = { r, c };
            this.cells[r][c].closest("td").classList.add("current");

            // ハイライト
            this.highlightWord(r, c);

            // ★★★ これを追加（最初のクリックでもヒントが出る）
            this.updateCurrentClue(r, c);

            return;
        }

        /* ============================================================
           ② すでにキーワード選択中（currentPos がある）
        ============================================================ */

        const prevDirection = this.direction;

        // 横＋縦 → 元の direction を優先
        if (isAcross && isDown) {
            this.direction = prevDirection;
        }
        // 横のみ
        else if (isAcross) {
            this.direction = "across";
        }
        // 縦のみ
        else if (isDown) {
            this.direction = "down";
        }

        // current 更新
        document.querySelectorAll(".current").forEach(el => el.classList.remove("current"));
        this.currentPos = { r, c };
        this.cells[r][c].closest("td").classList.add("current");

        // ハイライト
        this.highlightWord(r, c);

        // ヒント更新
        this.updateCurrentClue(r, c);
    }



    isIntersection(r, c) {
        const across =
            (c > 0 && this.data.grid[r][c - 1] !== ".") ||
            (c < this.data.size[1] - 1 && this.data.grid[r][c + 1] !== ".");

        const down =
            (r > 0 && this.data.grid[r - 1][c] !== ".") ||
            (r < this.data.size[0] - 1 && this.data.grid[r + 1][c] !== ".");

        return across && down;
    }

    isAcrossCell(r, c) {
        const cols = this.data.size[1];
        if (this.data.grid[r][c] === ".") return false;

        return (
            (c > 0 && this.data.grid[r][c - 1] !== ".") ||
            (c < cols - 1 && this.data.grid[r][c + 1] !== ".")
        );
    }

    isDownCell(r, c) {
        const rows = this.data.size[0];
        if (this.data.grid[r][c] === ".") return false;

        return (
            (r > 0 && this.data.grid[r - 1][c] !== ".") ||
            (r < rows - 1 && this.data.grid[r + 1][c] !== ".")
        );
    }

    getDefaultDirection(r, c) {
        if (c > 0 && this.data.grid[r][c - 1] !== ".") return "across";
        if (c < this.data.size[1] - 1 && this.data.grid[r][c + 1] !== ".") return "across";
        return "down";
    }

    highlightWord(r, c) {
        // 既存の active/current を全部消す
        document.querySelectorAll(".active-across, .active-down, .current-across, .current-down")
            .forEach(el => el.classList.remove("active-across", "active-down", "current-across", "current-down"));

        const dir = this.direction;

        if (dir === "across") {
            let startC = c;
            while (startC > 0 && this.data.grid[r][startC - 1] !== ".") startC--;

            let endC = c;
            while (endC < this.data.size[1] - 1 && this.data.grid[r][endC + 1] !== ".") endC++;

            for (let col = startC; col <= endC; col++) {
                this.cells[r][col].closest("td").classList.add("active-across");
            }
            // current の色
            this.cells[r][c].closest("td").classList.add("current-across");
        } else {
            let startR = r;
            while (startR > 0 && this.data.grid[startR - 1][c] !== ".") startR--;

            let endR = r;
            while (endR < this.data.size[0] - 1 && this.data.grid[endR + 1][c] !== ".") endR++;

            for (let row = startR; row <= endR; row++) {
                this.cells[row][c].closest("td").classList.add("active-down");
            }
            // current の色
            this.cells[r][c].closest("td").classList.add("current-down");
        }
    }

    getWordCells(r, c, dir) {
        const list = [];

        if (dir === "across") {
            let sc = c;
            while (sc > 0 && this.data.grid[r][sc - 1] !== ".") sc--;
            let ec = c;
            while (ec < this.data.size[1] - 1 && this.data.grid[r][ec + 1] !== ".") ec++;
            for (let col = sc; col <= ec; col++) list.push({ r, c: col });
        } else {
            let sr = r;
            while (sr > 0 && this.data.grid[sr - 1][c] !== ".") sr--;
            let er = r;
            while (er < this.data.size[0] - 1 && this.data.grid[er + 1][c] !== ".") er++;
            for (let row = sr; row <= er; row++) list.push({ r: row, c });
        }

        return list;
    }

    updateCurrentClue(r, c) {
        const clueBox = document.getElementById("current-clue");
        if (!clueBox) return;

        // まず背景色クラスをリセット
        clueBox.classList.remove("clue-across", "clue-down");

        // currentPos が null → 非表示
        if (!this.currentPos) {
            clueBox.innerText = "";
            return;
        }

        const dir = this.direction;
        const clueList = dir === "across" ? this.data.clues.across : this.data.clues.down;

        for (const item of clueList) {
            const [rr, cc] = item.pos;

            // このヒントの開始位置と一致するか
            const cells = this.getWordCells(rr, cc, dir);
            if (cells.some(pos => pos.r === r && pos.c === c)) {

                const num = this.numbers[rr][cc];  // ← ヒント番号を取得

                // 表示内容（番号＋ヒント文）
                clueBox.innerText = `${dir === "across" ? "横" : "縦"} ${num}. ${item.clue}`;

                // 背景色を direction に応じて付与
                clueBox.classList.add(dir === "across" ? "clue-across" : "clue-down");

                return;
            }
        }

        // 見つからない場合は空にする
        clueBox.innerText = "";
    }


    moveNext() {
        const rows = this.data.size[0];
        const cols = this.data.size[1];

        // ★ current をクリア
        document.querySelectorAll(".current").forEach(el => el.classList.remove("current"));

        const { r, c } = this.currentPos;
        const prevDirection = this.direction; // ★ 交差点で優先するため保存


        /* ============================================================
           ① 現在のキーワード（横 or 縦）のセル一覧を取得
        ============================================================ */
        const getWordCells = (rr, cc, dir) => {
            const list = [];
            if (dir === "across") {
                let sc = cc;
                while (sc > 0 && this.data.grid[rr][sc - 1] !== ".") sc--;
                let ec = cc;
                while (ec < cols - 1 && this.data.grid[rr][ec + 1] !== ".") ec++;
                for (let col = sc; col <= ec; col++) list.push({ r: rr, c: col });
            } else {
                let sr = rr;
                while (sr > 0 && this.data.grid[sr - 1][cc] !== ".") sr--;
                let er = rr;
                while (er < rows - 1 && this.data.grid[er + 1][cc] !== ".") er++;
                for (let row = sr; row <= er; row++) list.push({ r: row, c: cc });
            }
            return list;
        };

        const wordCells = getWordCells(r, c, this.direction);


        /* ============================================================
           ② 現在のキーワード内で「次の未入力マス」を探す
        ============================================================ */
        const idx = wordCells.findIndex(pos => pos.r === r && pos.c === c);

        for (let i = idx + 1; i < wordCells.length; i++) {
            const pos = wordCells[i];
            if (this.cells[pos.r][pos.c].innerText === "") {
                this.currentPos = pos;
                this.cells[pos.r][pos.c].focus();
                this.cells[pos.r][pos.c].closest("td").classList.add("current");
                this.highlightWord(pos.r, pos.c);
                return;
            }
        }


        /* ============================================================
           ③ キーワード内が埋まった → 次のキーワードを探す
        ============================================================ */

        const findNextKeyword = (preferDir) => {
            const clueList = preferDir === "across"
                ? this.data.clues.across
                : this.data.clues.down;

            for (const item of clueList) {
                const [rr, cc] = item.pos;
                const cells = getWordCells(rr, cc, preferDir);

                for (const pos of cells) {
                    if (this.cells[pos.r][pos.c].innerText === "") {
                        return { pos, dir: preferDir };
                    }
                }
            }
            return null;
        };

        let next = null;

        if (this.direction === "across") {
            // 横 → 次の横 → 次の縦
            next = findNextKeyword("across") || findNextKeyword("down");
        } else {
            // 縦 → 次の縦 → 次の横
            next = findNextKeyword("down") || findNextKeyword("across");
        }


        /* ============================================================
           ④ 次のキーワードが見つかった場合
        ============================================================ */
        if (next) {
            this.direction = next.dir;
            this.currentPos = next.pos;
            this.cells[next.pos.r][next.pos.c].focus();
            this.cells[next.pos.r][next.pos.c].closest("td").classList.add("current");
            this.highlightWord(next.pos.r, next.pos.c);
            return;
        }


        /* ============================================================
           ⑤ 全マス埋まっている → current は移動しない
        ============================================================ */
        this.currentPos = { r, c };
        this.cells[r][c].closest("td").classList.add("current");
        this.highlightWord(r, c);

        // ★ ヒント更新
        this.updateCurrentClue(r, c);
    }

    setLetter(ch) {
        if (!this.currentPos) return;

        let { r, c } = this.currentPos;

        if (ch === "BACK") {

            const cell = this.cells[r][c];

            // ① current に文字が入っている → 文字だけ消す
            if (cell.innerText !== "") {
                cell.innerText = "";
                cell.closest("td").classList.add("current");
                this.highlightWord(r, c);
                return;
            }

            // ② current が空欄 → 前のマスへ移動して削除
            const wordCells = this.getWordCells(r, c, this.direction);
            const idx = wordCells.findIndex(pos => pos.r === r && pos.c === c);

            if (idx === 0) {
                cell.closest("td").classList.add("current");
                this.highlightWord(r, c);
                return;
            }

            const prev = wordCells[idx - 1];
            const prevCell = this.cells[prev.r][prev.c];

            prevCell.innerText = "";

            this.currentPos = prev;
            prevCell.closest("td").classList.add("current");
            this.highlightWord(prev.r, prev.c);

            return;
        }

        // 通常入力
        this.cells[r][c].innerText = ch;
        this.moveNext();
        this.updateCurrentClue(this.currentPos.r, this.currentPos.c);
    }

    checkAnswers() {
        for (let r = 0; r < this.data.size[0]; r++) {
            for (let c = 0; c < this.data.size[1]; c++) {
                const correct = this.data.grid[r][c];
                if (correct !== "." && this.cells[r][c]) {
                    const val = this.cells[r][c].innerText.toUpperCase();
                    if (val !== correct) return false;
                }
            }
        }
        return true;
    }

    getKeyword() {
        return this.data.keywordCells
            .map(([r, c]) => this.cells[r][c].innerText.toUpperCase())
            .join("");
    }
}



/* ============================================================
   初期化
============================================================ */
window.addEventListener("DOMContentLoaded", async () => {
    const puzzleData = await loadPuzzle();
    if (!puzzleData) return;

    const cw = new Crossword(puzzleData);
    cw.render("crossword");

    renderKeyboard(ch => cw.setLetter(ch));

    document.getElementById("check").addEventListener("click", () => {

        // ① 未入力マスがあるかチェック
        let hasEmpty = false;
        for (let r = 0; r < cw.data.size[0]; r++) {
            for (let c = 0; c < cw.data.size[1]; c++) {
                if (cw.data.grid[r][c] !== "." && cw.cells[r][c].innerText === "") {
                    hasEmpty = true;
                    break;
                }
            }
            if (hasEmpty) break;
        }

        if (hasEmpty) {
            alert("未入力のマスがあります");
            return;
        }

        // ② 全部正解か？
        if (cw.checkAnswers()) {
            const keyword = cw.getKeyword();
            document.getElementById("keyword").innerText =
                "キーワードは「" + keyword + "」です";
            document.getElementById("keyword").classList.remove("hidden");
            return;
        }

        // ③ 不正解がある
        alert("間違いがあります");
    });


    document.addEventListener("click", (e) => {
        const isCell = e.target.closest("td");
        const isKeyboard = e.target.closest("#keyboard");

        if (!isCell && !isKeyboard) {

            // ★ 方向別 current を全部消す
            document.querySelectorAll(".current-across, .current-down")
                .forEach(el => el.classList.remove("current-across", "current-down"));

            // ★ 方向別 active を全部消す
            document.querySelectorAll(".active-across, .active-down")
                .forEach(el => el.classList.remove("active-across", "active-down"));

            // ★ currentPos をリセット
            if (cw) cw.currentPos = null;

            // ★ ヒントも非表示（背景色も消す）
            const clueBox = document.getElementById("current-clue");
            if (clueBox) {
                clueBox.innerText = "";
                clueBox.classList.remove("clue-across", "clue-down");
            }
        }
    });
});

function adjustCellSize() {
    document.querySelectorAll(".cell").forEach(cell => {
        const w = cell.offsetWidth;
        cell.style.height = w + "px";
    });
}

window.addEventListener("load", adjustCellSize);
window.addEventListener("resize", adjustCellSize);