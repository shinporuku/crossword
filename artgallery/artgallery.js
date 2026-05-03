let galleryData = null;
let lang = "jp";

window.addEventListener("DOMContentLoaded", async () => {
    const uiRes = await fetch("/artgallery/ui_text.json");
    galleryData = await uiRes.json();

    const cleared = localStorage.getItem("crossword_cleared") === "true";
    lang = localStorage.getItem("crossword_lang") || "jp";

    if (!cleared) {
        updateGalleryUI(lang, galleryData);
        alert(lang === "jp" ? "クロスワードをクリアすると入場できます。" : "크로스워드를 클리어하면 입장할 수 있습니다.");
        window.location.href = "/";
        return;
    }

    updateGalleryUI(lang, galleryData);

    document.getElementById("gallery").classList.remove("hidden");
    await loadArtImages();
});

async function loadArtImages() {
    const artList = document.getElementById("art-list");
    const res = await fetch("./art/index.json");
    const items = await res.json();

    items.forEach(item => {
        const div = document.createElement("div");
        div.className = "art-item";

        const img = document.createElement("img");
        img.src = `./art/${item.file}`;
        img.alt = lang === "jp" ? item.title_jp : item.title_kr;

        const caption = document.createElement("div");
        caption.className = "art-caption";
        caption.innerText = lang === "jp" ? item.title_jp : item.title_kr;

        div.appendChild(img);
        div.appendChild(caption);

        const descText = lang === "jp" ? item.desc_jp : item.desc_kr;
        if (descText && descText.trim() !== "") {
            const desc = document.createElement("div");
            desc.className = "art-desc";
            desc.innerHTML = descText.replace(/\n/g, "<br>");
            div.appendChild(desc);
        }

        artList.appendChild(div);
    });
}

function updateGalleryUI(lang, data) {
    const ui = lang === "jp" ? data.gallery_ui_jp : data.gallery_ui_kr;

    document.querySelector(".gallery-header h1").innerText = ui.title;
    document.querySelector(".gallery-header p").innerText = ui.subtitle;
    document.getElementById("gate-message").innerText = ui.gate;
    document.getElementById("back-to-crossword").innerText = ui["back-to-crossword"];

    const jp = document.getElementById("lang-jp");
    const kr = document.getElementById("lang-kr");

    if (lang === "jp") {
        jp.classList.add("active");
        kr.classList.remove("active");
    } else {
        kr.classList.add("active");
        jp.classList.remove("active");
    }
}

document.getElementById("lang-jp").addEventListener("click", async () => {
    if (lang !== "jp") {
        lang = "jp";
        localStorage.setItem("crossword_lang", "jp");
        updateGalleryUI(lang, galleryData);
        document.getElementById("art-list").innerHTML = "";
        await loadArtImages();
    }
});

document.getElementById("lang-kr").addEventListener("click", async () => {
    if (lang !== "kr") {
        lang = "kr";
        localStorage.setItem("crossword_lang", "kr");
        updateGalleryUI(lang, galleryData);
        document.getElementById("art-list").innerHTML = "";
        await loadArtImages();
    }
});

document.getElementById("back-to-crossword").addEventListener("click", () => {
    window.location.href = "/";
});