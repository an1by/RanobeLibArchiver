// ==UserScript==
// @name         RanobeLib Archiver
// @namespace    https://github.com/An1by/RanobeLibArchiver
// @version      1.1
// @description  Download ranobe from ranobelib.me as archived zip.
// @author       An1by
// @include      /^https?:\/\/ranobelib\.me\/ru\/book\/[\w\-]+(?:\?.+|#.*)?$/
// @icon         https://ranobelib.me/images/logo/rl/favicon.ico
// @require      https://cdnjs.cloudflare.com/ajax/libs/jszip/3.9.1/jszip.min.js
// @grant        none
// ==/UserScript==

///////////// FUNCTIONS
// Default fetch
async function jsonFetch(url) {
    const response = await fetch(url, {method: "GET"})
    const text = await response.text()
    return JSON.parse(text)
}

// Chapters
async function fetchRanobeChapters(ranobeId) {
    return (await jsonFetch(
        `https://api.lib.social/api/manga/${ranobeId}/chapters`
    )).data
}

async function fetchChapter(ranobeId, volume, number) {
    return (await jsonFetch(
        `https://api.lib.social/api/manga/${ranobeId}/chapter?number=${number}&volume=${volume}`
    )).data
}

async function fetchRanobeData(ranobeId) {
    return (await jsonFetch(
        `https://api.lib.social/api/manga/${ranobeId}?fields[]=background&fields[]=eng_name&fields[]=otherNames&fields[]=summary&fields[]=releaseDate&fields[]=type_id&fields[]=caution&fields[]=views&fields[]=close_view&fields[]=rate_avg&fields[]=rate&fields[]=genres&fields[]=tags&fields[]=teams&fields[]=franchise&fields[]=authors&fields[]=publisher&fields[]=userRating&fields[]=moderated&fields[]=metadata&fields[]=metadata.count&fields[]=metadata.close_comments&fields[]=manga_status_id&fields[]=chap_count&fields[]=status_id&fields[]=artists&fields[]=format`
    )).data
}

// Formatting
function formatRanobeLabel(json) {
    if ("rus_name" in json)
        return json.rus_name
    if ("eng_name" in json)
        return json.eng_name
    return json.name
}

// logging
function logStartDownload(label, slug) {
    console.log(`Начата загрузка ${label} (${slug})!`)
}

function logTitleCreate(label, slug) {
    console.log(`Создан файл с описанием ранобе ${label} (${slug})!`)
}

function logChapter(chapter, last_chapter) {
    console.log(`Скачано: Том ${chapter.volume} Глава ${chapter.number} / Том ${last_chapter.volume} Глава ${last_chapter.number}`)
}

function notify(text) {
    const fields = document.getElementsByClassName("a0_a1")[0].firstChild

    const element = document.createElement("div")
    element.className = "kp_bm"
    element.innerHTML =
        `<div class="kp_ap kp_z">
                <div class="kp_bw">
                    <svg class="svg-inline--fa fa-circle-info" aria-hidden="true" focusable="false" data-prefix="fas"
                         data-icon="circle-info" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
                        <path class="" fill="currentColor"
                              d="M256 512c141.4 0 256-114.6 256-256S397.4 0 256 0S0 114.6 0 256S114.6 512 256 512zM216 336h24V272H216c-13.3 0-24-10.7-24-24s10.7-24 24-24h48c13.3 0 24 10.7 24 24v88h8c13.3 0 24 10.7 24 24s-10.7 24-24 24H216c-13.3 0-24-10.7-24-24s10.7-24 24-24zm40-144c-17.7 0-32-14.3-32-32s14.3-32 32-32s32 14.3 32 32s-14.3 32-32 32z"></path>
                    </svg>
                </div>
                <div class="">
                    <div class="kp_v">${text}</div>
                    <!----><!----></div>
            </div>`

    fields.appendChild(element)

    setTimeout(() => {
        fields.removeChild(element)
    }, 3000)
}

// Download
const mangaNumberRegex = new RegExp("/^\\d+(--)")
async function download(e) {
    notify("Загрузка начата!")

    try {
        // Zip
        const zip = new JSZip()

        // Data
        const path = window.location.pathname.split("/")
        const ranobeId = path[path.length - 1]

        let label

        const ranobeData = await fetchRanobeData(ranobeId)
        console.log(ranobeData)
        const slug = ranobeId.replace(mangaNumberRegex, "");
        if ("toast" in ranobeData) {
            // Ranobe Title
            label = document.getElementsByClassName("nt_nv")[0].innerText
            const originalLabel = document.getElementsByClassName("nt_nw")[0].innerText
            const description = document.getElementsByClassName("ur_p")[0].innerText

            // info.txt
            const infoText = `${label}\n${originalLabel}\n\n`
                + `--==[ Описание ]==--\n${description}\n\n`
                + `--==[ Страница ]==-\nhttps://ranobelib.me/ru/book/${ranobeId}`
            zip.file(
                `info.txt`,
                infoText
            );
        } else {
            // Ranobe Title
            label = formatRanobeLabel(ranobeData)

            // info.txt
            const infoText = `${label}\n${ranobeData.name}\n\n`
                + `--==[ Описание ]==--\n${ranobeData.summary}\n\n`
                + `--==[ Информация ]==--\nТип: ${ranobeData.type.label}\nВыпуск: ${ranobeData.releaseDate} г.\nСтатус: ${ranobeData.status.label}\nПеревод: ${ranobeData.scanlateStatus.label}\n\n`
                + `--==[ Страница ]==-\nhttps://ranobelib.me/ru/book/${ranobeData.slug_url}`
            zip.file(
                `info.txt`,
                infoText
            );
        }
        logStartDownload(label, slug)

        // Chapters .txt
        const chapters = await fetchRanobeChapters(ranobeId)
        const last_chapter = chapters[chapters.length - 1]
        for (const chapterData of chapters) {
            const chapter = await fetchChapter(ranobeId, chapterData.volume, chapterData.number)

            // Text
            let builder = `${label}\nТом ${chapter.volume} Глава ${chapterData.number}\n\n`;

            const p = new DOMParser(), doc = p.parseFromString(chapter.content, "text/html");
            for (const element of doc.getElementsByTagName("p")) {
                builder += element.innerText + "\n"
            }

            zip.file(
                `v${chapter.volume}_${chapter.number}.txt`,
                builder
            );
            logChapter(chapter, last_chapter)
        }

        // Compressing
        const base64 = await zip.generateAsync({type: "base64"})
        const a = document.createElement("a");
        a.href = "data:application/zip;base64," + base64;
        a.download = `${slug}.zip`;
        a.click();
    } catch (e) {
        console.log(e)
        notify("Во время загрузки произошла ошибка!")
        return
    }

    notify("Загрузка успешно закончена!")
}

// Button creating
function createButton() {
    const elements = document.getElementsByClassName("jh_e7 jh_by");
    if (elements.length === 0) {
        return;
    }


    const downloadButton = document.createElement("div");
    downloadButton.className = "r8_c6";
    const be = document.createElement("div");
    be.className = "r8_be";
    be.innerText = "📥";
    downloadButton.appendChild(be)

    const upMenu = elements[0]
    upMenu.insertBefore(downloadButton, upMenu.firstChild);

    downloadButton.addEventListener("click", async (e) => {
        await download(e)
    });
}

createButton()
