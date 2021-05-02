// Basic Closure
class Basic {
    getDate() {							                // Overpass Queryに付ける日付指定
        let seldate = $("#Select_Date").val();
        return seldate ? '[date:"' + (new Date(seldate)).toISOString() + '"]' : "";
    }

    formatDate(date, format) {
        // date format
        try {
            format = format.replace(/YYYY/g, date.getFullYear());
            format = format.replace(/YY/g, date.getFullYear().toString().slice(-2));
            format = format.replace(/MM/g, ('0' + (date.getMonth() + 1)).slice(-2));
            format = format.replace(/DD/g, ('0' + date.getDate()).slice(-2));
            format = format.replace(/hh/g, ('0' + date.getHours()).slice(-2));
            format = format.replace(/mm/g, ('0' + date.getMinutes()).slice(-2));
            format = format.replace(/ss/g, ('0' + date.getSeconds()).slice(-2));
        } catch {
            format = "";
        };
        return format;
    }

    dataURItoBlob(dataURI) {                               // DataURIからBlobへ変換（ファイルサイズ2MB超過対応）
        const b64 = atob(dataURI.split(',')[1]);
        const u8 = Uint8Array.from(b64.split(""), function (e) { return e.charCodeAt() });
        return new Blob([u8], { type: "image/png" });
    }
    concatTwoDimensionalArray(array1, array2, axis) {      // 2次元配列の合成
        if (axis != 1) axis = 0;
        var array3 = [];
        if (axis == 0) {    //　縦方向の結合
            array3 = array1.slice();
            for (var i = 0; i < array2.length; i++) {
                array3.push(array2[i]);
            }
        } else {              //　横方向の結合
            for (var i = 0; i < array1.length; i++) {
                array3[i] = array1[i].concat(array2[i]);
            };
        };
        return array3;
    }
    unicodeUnescape(str) {     // \uxxx形式→文字列変換
        let result = "", strs = str.match(/\\u.{4}/ig);
        if (!strs) return '';
        for (var i = 0, len = strs.length; i < len; i++) {
            result += String.fromCharCode(strs[i].replace('\\u', '0x'));
        };
        return result;
    }
    uniq(array) {
        let elems = new Map();
        for (let elem of array) {
            elems.set(elem, true); // 同じキーに何度も値を設定しても問題ない
        };
        return Array.from(elems.keys());
    }
    getWikipedia(lang, url) {      // get wikipedia contents
        return new Promise((resolve, reject) => {
            let encurl = encodeURI(url);
            encurl = "https://" + lang + "." + Conf.osm.wikipedia.api + encurl;
            $.get({ url: encurl, dataType: "jsonp" }, function (data) {
                let key = Object.keys(data.query.pages);
                let text = data.query.pages[key].extract;
                console.log(text);
                resolve(text);
            });
        });
    }
    isSmartPhone() {
        if (window.matchMedia && window.matchMedia('(max-device-width: 640px)').matches) {
            return true;
        } else {
            return false;
        };
    }
    convLinkTag(url) {
        return (/^(ftp|http|https):\/\/[^ "]+$/.test(url)) ? `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>` : "";
    }
};
var basic = new Basic();

// Display Status(progress&message)
var WinCont = (function () {
    var modal_open = false, MW = "#modal_window";

    return {
        splash: (mode) => {
            $("#splash_image").attr("src", Conf.splash.url);
            let act = mode ? { backdrop: 'static', keyboard: false } : 'hide';
            $('#Splash_Modal').modal(act);
        },
        modal_open: p => {   // open modal window(p: title,message,mode(yes no close),callback_yes,callback_no,callback_close)
            $(`${MW}_spinner`).hide();
            $(`${MW}_title`).html(p.title);
            $(`${MW}_message`).html(p.message);
            [`${MW}_yes`, `${MW}_no`, `${MW}_close`].forEach(id => $(id).hide());
            if (p.mode.indexOf("yes") > -1) $(`${MW}_yes`).html(glot.get("button_yes")).on('click', p.callback_yes).show();
            if (p.mode.indexOf("no") > -1) $(`${MW}_no`).html(glot.get("button_no")).on('click', p.callback_no).show();
            if (p.mode.indexOf("close") > -1) $(`${MW}_close`).html(glot.get("button_close")).on('click', p.callback_close).show();
            $(MW).modal({ backdrop: false, keyboard: true });
            modal_open = true;
            $(MW).on('shown.bs.modal', () => { if (!modal_open) $(MW).modal('hide') }); // Open中にCloseされた時の対応
            $(MW).on('hidden.bs.modal', () => p.callback_close());                        // "x" click
        },
        modal_text: (text, append) => {
            let newtext = append ? $(`${MW}_message`).html() + text : text;
            $(`${MW}_message`).html(newtext);
        },
        modal_spinner: view => {
            if (view) {
                $(`${MW}_spinner`).show();
            } else {
                $(`${MW}_spinner`).hide();
            };
        },
        modal_progress: percent => {
            percent = percent == 0 ? 0.1 : percent;
            $(`${MW}_progress`).css('width', parseInt(percent) + "%");
        },
        modal_close: () => {            // close modal window
            modal_open = false;
            // WinCont.modal_progress(0);
            $(`${MW}`).modal('hide');
            [`${MW}_yes`, `${MW}_no`, `${MW}_close`].forEach(id => $(id).off('click'));
        },
        menu_make: () => {
            Object.keys(Conf.menu).forEach(key => {
                let link, confkey = Conf.menu[key];
                if (confkey.linkto.indexOf("html:") > -1) {
                    $("#temp_menu>span:first").html(confkey.linkto.substring(5));
                    link = $("#temp_menu>span:first").clone();
                } else {
                    $("#temp_menu>a:first").attr("href", confkey.linkto);
                    $("#temp_menu>a:first").attr("target", "");
                    if (confkey.linkto.indexOf("javascript:") == -1) $("#temp_menu>a:first").attr("target", "_blank");
                    $("#temp_menu>a>span:first").attr("glot-model", confkey["glot-model"]);
                    link = $("#temp_menu>a:first").clone();
                };
                $("#temp_menu").append(link);
                if (confkey["divider"]) $("#temp_menu>div:first").clone().appendTo($("#temp_menu"));
            });
            $("#temp_menu>a:first").remove();
            $("#temp_menu>span:first").remove();
            $("#temp_menu>div:first").remove();
        },
        select_add: (domid, text, value) => {
            let option = document.createElement("option");
            option.text = text;
            option.value = value;
            document.getElementById(domid).appendChild(option);
        },
        select_clear: (domid) => {
            $('#' + domid + ' option').remove();
            $('#' + domid).append($('<option>').html("---").val("-"));
        },
        window_resize: () => {
            console.log("Window: resize.");
            let mapWidth = basic.isSmartPhone() ? window.innerWidth - 20 : window.innerWidth * 0.3;
            mapWidth = mapWidth < 320 ? 320 : mapWidth;
            if (typeof baselist !== "undefined") baselist.style.width = mapWidth + "px";
            if (typeof mapid !== "undefined") mapid.style.height = window.innerHeight + "px";
        }
    };
})();
