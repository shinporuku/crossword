class Crossword {
    constructor(data) {
        this.data = data;
        this.cells = [];
        this.numbers = [];
        this.direction = "across"; // 現在の入力方向
        this.currentPos = null;
    }

    render(targetId) {
        const target = document.getElementById(targetId);
        const table = document.createElement("table");

        const rows = this.data.size[0];
        const cols = this.data.size[1];

        let number = 1;
        this.numbers = Array.from({ length: rows }, () => Array(cols).fill(null));

        for (let r = 0; r < rows; r++) {
            const row = document.createElement("tr");
            this.cells[r] = [];

            for (let c = 0; c < cols; c++) {
                const cell = document.createElement("td");
                cell.className = "cell";

                const isBlack = this.data.grid[r][c] === ".";

                if (isBlack) {
                    cell.classList.add("black");
                } else {
                    const startAcross = (c === 0 || this.data.grid[r][c - 1] === ".");
                    const startDown = (r === 0 || this.data.grid[r - 1][c] === ".");

                    if (startAcross || startDown) {
                        this.numbers[r][c] = number++;

                        const numDiv = document.createElement("div");
                        numDiv.className = "number";
                        numDiv.innerText = this.numbers[r][c];
                        cell.appendChild(numDiv);
                    }

                    const input = document.createElement("input");
                    input.maxLength = 1;
                    input.className = "letter";
                    cell.appendChild(input);
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
        for (const [num, clue] of Object.entries(this.data.clues.across)) {
            const li = document.createElement("li");
            li.innerText = `${num}. ${clue}`;
            acrossList.appendChild(li);
        }
        cluesDiv.appendChild(acrossList);

        const downTitle = document.createElement("h3");
        downTitle.innerText = "縦（Down）";
        cluesDiv.appendChild(downTitle);

        const downList = document.createElement("ul");
        for (const [num, clue] of Object.entries(this.data.clues.down)) {
            const li = document.createElement("li");
            li.innerText = `${num}. ${clue}`;
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
                    if (this.isIntersection(r, c)) {
                        this.direction = (this.direction === "across") ? "down" : "across";
                    } else {
                        this.direction = this.getDefaultDirection(r, c);
                    }

                    this.highlightWord(r, c);
                    this.currentPos = { r, c };
                });

                input.addEventListener("input", () => {
                    this.moveNext();
                });
            }
        }
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

    getDefaultDirection(r, c) {
        if (c < this.data.size[1] - 1 && this.data.grid[r][c + 1] !== ".") {
            return "across";
        }
        return "down";
    }

    highlightWord(r, c) {
        document.querySelectorAll(".active").forEach(el => el.classList.remove("active"));
        document.querySelectorAll(".current").forEach(el => el.classList.remove("current"));

        this.cells[r][c].parentElement.classList.add("current");

        if (this.direction === "across") {
            let startC = c;
            while (startC > 0 && this.data.grid[r][startC - 1] !== ".") startC--;

            let endC = c;
            while (endC < this.data.size[1] - 1 && this.data.grid[r][endC + 1] !== ".") endC++;

            for (let col = startC; col <= endC; col++) {
                this.cells[r][col].parentElement.classList.add("active");
            }
        } else {
            let startR = r;
            while (startR > 0 && this.data.grid[startR - 1][c] !== ".") startR--;

            let endR = r;
            while (endR < this.data.size[0] - 1 && this.data.grid[endR + 1][c] !== ".") endR++;

            for (let row = startR; row <= endR; row++) {
                this.cells[row][c].parentElement.classList.add("active");
            }
        }
    }

    moveNext() {
        const { r, c } = this.currentPos;

        if (this.direction === "across") {
            let nextC = c + 1;
            if (nextC < this.data.size[1] && this.data.grid[r][nextC] !== ".") {
                this.cells[r][nextC].focus();
                this.currentPos = { r, c: nextC };
                return;
            }
        } else {
            let nextR = r + 1;
            if (nextR < this.data.size[0] && this.data.grid[nextR][c] !== ".") {
                this.cells[nextR][c].focus();
                this.currentPos = { r: nextR, c };
                return;
            }
        }
    }

    checkAnswers() {
        for (let r = 0; r < this.data.size[0]; r++) {
            for (let c = 0; c < this.data.size[1]; c++) {
                const correct = this.data.grid[r][c];
                if (correct !== "." && this.cells[r][c]) {
                    const val = this.cells[r][c].value.toUpperCase();
                    if (val !== correct) return false;
                }
            }
        }
        return true;
    }

    getKeyword() {
        return this.data.keywordCells
            .map(([r, c]) => this.cells[r][c].value.toUpperCase())
            .join("");
    }
}
