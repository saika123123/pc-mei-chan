/**
 * chatgpt.js
 * ChatGPTに関するクラス
 */

/**
 * ChatGPTAPIで解答を取得する
 */
async function getChatgpt(ans) {
    const url = "https://wsapp.cs.kobe-u.ac.jp/gitlab-nodejs/chatgpt/text=" + ans;
    return fetch(url, {
        method: 'GET',
        mode: 'cors',
    })
        .then(response => {
            //レスポンスコードをチェック
            if (response.status == 200) {
                var json = response.json();
                console.log(json);
                return json;
            } else {
                throw new Error(response);
            }
        })
        .catch(err => {
            console.log("Failed to fetch " + url, err);
            throw new Error(err);
        });
}

/*--------------- 以下対話シナリオ ---------------*/

/**
 *　質問を検索する
 */
async function chatgpt() {
    let flag = true;
    let count = 0;
        let ans = await miku_ask("チャットGPTに何を聞きたいですか？ (質問 / やめる)", false, "guide_normal");
        if (/^やめる$/.test(ans) || count > 4) {
            serviceFlag = false;
            return;
        }
        // for (let data of prefecturesData) {
        //     let keyword = new RegExp(data.name.slice(0, -1));
        //     if (keyword.test(ans)) {
        //         prefecture = data;
        //         flag = false;
        //         break;
        //     }
        // }
        console.log(ans)
        flag=false;
        count++;
    console.log(111111);
    console.log(ans);
    console.log(222222);
    await miku_say("親友のチャットGPT君に聞いてきますね！少しお待ちください！");
    let result = await getChatgpt(ans);
    if(result.error){
        await miku_say("Chatgptからの解答を取得できませんでした", "normal");
        return;
    }

    let str = "<div> 【ChatGPTからの返答が来ました！】 </div>";
    
    str += "<div>" + result.content +"</div>";
    
    post_keicho(str, SPEAKER.AGENT, person);

    serviceFlag = false;
    return;
}
