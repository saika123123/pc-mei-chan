/**
 * circle-service.js
 * PCメイちゃんとオンラインサークルサービスを連携するためのスクリプト
 */

// サークルサービスのベースURL
const CIRCLE_SERVICE_URL = "https://es4.eedept.kobe-u.ac.jp/online-circle";

// 連携しているオンラインサークルサービス
const circleService = {
    name: "オンラインサークル",
    keyword: "サークル",
    description: "オンラインでサークル活動やビデオ会議を楽しめるサービス",
    func: async function () { await handleCircleService(); },
};

// 未読の招待や近日中の寄合フラグ（他のファイルからもアクセスできるようにグローバル変数として定義）
window.hasUnreadInvitations = false;
window.hasUpcomingGatherings = false;
window.unreadInvitationsCount = 0;
window.upcomingGatheringsCount = 0;
window.invitations = [];
window.upcomingGatherings = [];

// オンラインサークルサービスのメイン処理
async function handleCircleService() {
    try {
        // サービスフラグを立てる
        serviceFlag = true;

        // 未読の招待があるかチェック
        if (window.hasUnreadInvitations && window.invitations.length > 0) {
            await notifyInvitations();
        }

        // 開始予定の寄合があるかチェック
        if (window.hasUpcomingGatherings && window.upcomingGatherings.length > 0) {
            await notifyUpcomingGatherings();
        }

        // メインメニューを表示
        await showCircleMainMenu();

    } catch (error) {
        console.error("オンラインサークルサービスでエラーが発生しました:", error);
        await miku_say("申し訳ありません、オンラインサークルサービスとの連携中にエラーが発生しました。", "greeting");
    } finally {
        // 処理が終わったらサービスフラグを下ろす
        serviceFlag = false;
    }
}

// メインメニューを表示
async function showCircleMainMenu() {
    let menuText = "<div>【オンラインサークルサービス】</div>";
    menuText += "<div>1. サークルに参加する</div>";
    menuText += "<div>2. 参加中のサークルを確認する</div>";
    menuText += "<div>3. 寄合を作成する</div>";
    menuText += "<div>4. 寄合一覧を確認する</div>";

    // メニュー表示
    post_keicho(menuText, SPEAKER.AGENT, person);

    // ユーザーの選択を待つ
    let choice = "";
    let validChoice = false;
    let count = 0;

    while (!validChoice && count < 3) {
        choice = await miku_ask("何をしますか？ 番号または項目名でお答えください。", false, "guide_normal");
        count++;

        if (/1|参加する|サークルに参加/.test(choice)) {
            await handleJoinCircle();
            validChoice = true;
        } else if (/2|確認する|参加中|サークルを確認/.test(choice)) {
            await handleCheckCircles();
            validChoice = true;
        } else if (/3|作成する|寄合を作成/.test(choice)) {
            await handleCreateGathering();
            validChoice = true;
        } else if (/4|寄合一覧|寄合を確認/.test(choice)) {
            await handleCheckGatherings();
            validChoice = true;
        } else if (/終了|やめる|キャンセル/.test(choice)) {
            await miku_say("オンラインサークルサービスを終了します。", "greeting");
            return;
        } else {
            await miku_say("申し訳ありません、選択肢から選んでください。", "idle_think");
        }
    }

    if (!validChoice) {
        await miku_say("選択肢から選択されなかったため、オンラインサークルサービスを終了します。", "greeting");
    }
}

// 招待を通知
async function notifyInvitations() {
    const invitationText = `${window.unreadInvitationsCount}件の寄合への招待が届いています。`;
    await miku_say(invitationText, "greeting");

    let detailText = "<div>【未回答の寄合招待】</div>";
    for (let i = 0; i < window.invitations.length && i < 3; i++) {
        const inv = window.invitations[i];
        const dateStr = new Date(inv.datetime).toLocaleString('ja-JP');
        detailText += `<div>・${inv.theme}（${dateStr}）- ${inv.circle_name}</div>`;
    }

    if (window.invitations.length > 3) {
        detailText += "<div>他、" + (window.invitations.length - 3) + "件</div>";
    }

    post_keicho(detailText, SPEAKER.AGENT, person);

    const answer = await miku_ask("招待に応答しますか？", false, "guide_normal");
    if (/はい|応答|する/.test(answer)) {
        await handleInvitationResponse();
    }
}

// 近日中の寄合を通知
async function notifyUpcomingGatherings() {
    let gatheringText = "";
    if (window.upcomingGatheringsCount === 1) {
        const gathering = window.upcomingGatherings[0];
        const gatheringTime = new Date(gathering.datetime);
        const now = new Date();
        const diffMinutes = Math.floor((gatheringTime - now) / (1000 * 60));

        gatheringText = `「${gathering.theme}」の寄合がまもなく始まります。（あと約${diffMinutes}分）`;
    } else {
        gatheringText = `${window.upcomingGatheringsCount}件の寄合がまもなく始まります。`;
    }

    await miku_say(gatheringText, "greeting");

    if (window.upcomingGatherings.length > 1) {
        let detailText = "<div>【まもなく始まる寄合】</div>";
        for (const gathering of window.upcomingGatherings) {
            const gatheringTime = new Date(gathering.datetime);
            const now = new Date();
            const diffMinutes = Math.floor((gatheringTime - now) / (1000 * 60));
            detailText += `<div>・${gathering.theme}（あと約${diffMinutes}分）- ${gathering.circle_name}</div>`;
        }
        post_keicho(detailText, SPEAKER.AGENT, person);
    }

    const answer = await miku_ask("寄合に参加しますか？", false, "guide_normal");
    if (/はい|参加|する/.test(answer)) {
        if (window.upcomingGatherings.length === 1) {
            await joinGathering(window.upcomingGatherings[0].id);
        } else {
            await selectAndJoinGathering();
        }
    }
}

// 寄合を選択して参加する
async function selectAndJoinGathering() {
    let gatheringText = "<div>【参加する寄合を選んでください】</div>";
    for (let i = 0; i < window.upcomingGatherings.length; i++) {
        const gathering = window.upcomingGatherings[i];
        const dateStr = new Date(gathering.datetime).toLocaleString('ja-JP', {
            hour: '2-digit',
            minute: '2-digit'
        });
        gatheringText += `<div>${i + 1}. ${gathering.theme}（${dateStr}）- ${gathering.circle_name}</div>`;
    }

    post_keicho(gatheringText, SPEAKER.AGENT, person);

    const answer = await miku_ask("参加する寄合の番号を教えてください。", false, "guide_normal");
    const num = parseInt(answer.match(/\d+/) || ["0"][0]);

    if (num >= 1 && num <= window.upcomingGatherings.length) {
        await joinGathering(window.upcomingGatherings[num - 1].id);
    } else {
        await miku_say("有効な番号が選択されなかったため、操作をキャンセルします。", "greeting");
    }
}

// 寄合に参加する
async function joinGathering(gatheringId) {
    post_loading();
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${CIRCLE_SERVICE_URL}/api/gatherings/${gatheringId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        // ローディング表示を消す
        let element = document.getElementById('loading');
        if (element) {
            element.remove();
        }

        if (response.ok) {
            const data = await response.json();
            await miku_say("寄合情報を取得しました。", "greeting");

            let detailText = "<div>【寄合詳細】</div>";
            detailText += `<div>サークル: ${data.gathering.circle_name}</div>`;
            detailText += `<div>テーマ: ${data.gathering.theme}</div>`;
            detailText += `<div>日時: ${new Date(data.gathering.datetime).toLocaleString('ja-JP')}</div>`;
            if (data.gathering.details) {
                detailText += `<div>内容: ${data.gathering.details}</div>`;
            }

            post_keicho(detailText, SPEAKER.AGENT, person);

            // 参加URL表示
            if (data.gathering.url) {
                let urlText = "<div>【寄合に参加するためのURL】</div>";
                urlText += `<div>${data.gathering.url}</div>`;
                urlText += "<div>※このURLをブラウザで開くと寄合に参加できます</div>";

                post_keicho(urlText, SPEAKER.AGENT, person);
            }

            await miku_say("このURLをコピーしてブラウザで開くことで、寄合に参加できます。", "greeting");
        } else {
            await miku_say("寄合情報の取得に失敗しました。", "idle_think");
        }
    } catch (error) {
        // ローディング表示を消す
        let element = document.getElementById('loading');
        if (element) {
            element.remove();
        }

        console.error("寄合参加中にエラーが発生しました:", error);
        await miku_say("寄合への参加処理中にエラーが発生しました。", "idle_think");
    }
}

// サークル参加処理
async function handleJoinCircle() {
    post_loading();
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${CIRCLE_SERVICE_URL}/api/circles?type=join`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        // ローディング表示を消す
        let element = document.getElementById('loading');
        if (element) {
            element.remove();
        }

        if (response.ok) {
            const data = await response.json();

            if (data.circles && data.circles.length > 0) {
                let circleText = "<div>【参加可能なサークル】</div>";
                for (let i = 0; i < data.circles.length; i++) {
                    const circle = data.circles[i];
                    circleText += `<div>${i + 1}. ${circle.name} - ${circle.theme}</div>`;
                }

                post_keicho(circleText, SPEAKER.AGENT, person);

                const answer = await miku_ask("参加したいサークルの番号を教えてください。（「やめる」で中止できます）", false, "guide_normal");

                if (/やめる|中止|キャンセル/.test(answer)) {
                    await miku_say("サークル参加をキャンセルしました。", "greeting");
                    return;
                }

                const num = parseInt(answer.match(/\d+/) || ["0"][0]);

                if (num >= 1 && num <= data.circles.length) {
                    const selectedCircle = data.circles[num - 1];
                    await joinCircle(selectedCircle.id);
                } else {
                    await miku_say("選択されたサークルがありませんでした。", "idle_think");
                }
            } else {
                await miku_say("参加可能なサークルがありません。新しいサークルを作成しますか？", "guide_normal");

                const createAnswer = await miku_ask("「はい」または「いいえ」でお答えください。", false, "guide_normal");

                if (/はい|作成|する/.test(createAnswer)) {
                    await handleCreateCircle();
                }
            }
        } else {
            await miku_say("サークル情報の取得に失敗しました。", "idle_think");
        }
    } catch (error) {
        // ローディング表示を消す
        let element = document.getElementById('loading');
        if (element) {
            element.remove();
        }

        console.error("サークル参加処理中にエラーが発生しました:", error);
        await miku_say("サークル参加処理中にエラーが発生しました。", "idle_think");
    }
}

// サークルに参加する
async function joinCircle(circleId) {
    post_loading();
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${CIRCLE_SERVICE_URL}/api/circles/${circleId}/join`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        // ローディング表示を消す
        let element = document.getElementById('loading');
        if (element) {
            element.remove();
        }

        if (response.ok) {
            await miku_say("サークルへの参加が完了しました！", "greeting");
        } else {
            const data = await response.json();
            await miku_say(`サークルへの参加に失敗しました: ${data.message}`, "idle_think");
        }
    } catch (error) {
        // ローディング表示を消す
        let element = document.getElementById('loading');
        if (element) {
            element.remove();
        }

        console.error("サークル参加処理中にエラーが発生しました:", error);
        await miku_say("サークル参加処理中にエラーが発生しました。", "idle_think");
    }
}

// サークル作成処理
async function handleCreateCircle() {
    await miku_say("現在、サークル作成機能は実装中です。後日お試しください。", "greeting");
}

// サークル確認処理
async function handleCheckCircles() {
    post_loading();
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${CIRCLE_SERVICE_URL}/api/circles?type=check`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        // ローディング表示を消す
        let element = document.getElementById('loading');
        if (element) {
            element.remove();
        }

        if (response.ok) {
            const data = await response.json();

            if (data.circles && data.circles.length > 0) {
                let circleText = "<div>【参加中のサークル】</div>";
                for (let i = 0; i < data.circles.length; i++) {
                    const circle = data.circles[i];
                    circleText += `<div>${i + 1}. ${circle.name} - ${circle.theme}</div>`;
                }

                post_keicho(circleText, SPEAKER.AGENT, person);

                const answer = await miku_ask("詳細を確認したいサークルの番号を教えてください。（「やめる」で中止できます）", false, "guide_normal");

                if (/やめる|中止|キャンセル/.test(answer)) {
                    await miku_say("サークル確認を終了します。", "greeting");
                    return;
                }

                const num = parseInt(answer.match(/\d+/) || ["0"][0]);

                if (num >= 1 && num <= data.circles.length) {
                    const selectedCircle = data.circles[num - 1];
                    await getCircleDetails(selectedCircle.id);
                } else {
                    await miku_say("選択されたサークルがありませんでした。", "idle_think");
                }
            } else {
                await miku_say("参加しているサークルがありません。新しいサークルに参加しますか？", "guide_normal");

                const joinAnswer = await miku_ask("「はい」または「いいえ」でお答えください。", false, "guide_normal");

                if (/はい|参加|する/.test(joinAnswer)) {
                    await handleJoinCircle();
                }
            }
        } else {
            await miku_say("サークル情報の取得に失敗しました。", "idle_think");
        }
    } catch (error) {
        // ローディング表示を消す
        let element = document.getElementById('loading');
        if (element) {
            element.remove();
        }

        console.error("サークル確認処理中にエラーが発生しました:", error);
        await miku_say("サークル確認処理中にエラーが発生しました。", "idle_think");
    }
}

// サークル詳細を取得
async function getCircleDetails(circleId) {
    post_loading();
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${CIRCLE_SERVICE_URL}/api/circles/${circleId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        // ローディング表示を消す
        let element = document.getElementById('loading');
        if (element) {
            element.remove();
        }

        if (response.ok) {
            const data = await response.json();

            let detailText = "<div>【サークル詳細】</div>";
            detailText += `<div>名前: ${data.circle.name}</div>`;
            detailText += `<div>テーマ: ${data.circle.theme}</div>`;
            detailText += `<div>ジャンル: ${data.circle.genre}</div>`;
            detailText += `<div>対象: ${data.circle.gender}</div>`;
            if (data.circle.details) {
                detailText += `<div>詳細: ${data.circle.details}</div>`;
            }

            detailText += "<div></div><div>【メンバー】</div>";
            for (const member of data.members) {
                detailText += `<div>・${member.display_name}</div>`;
            }

            post_keicho(detailText, SPEAKER.AGENT, person);
        } else {
            await miku_say("サークル詳細の取得に失敗しました。", "idle_think");
        }
    } catch (error) {
        // ローディング表示を消す
        let element = document.getElementById('loading');
        if (element) {
            element.remove();
        }

        console.error("サークル詳細取得中にエラーが発生しました:", error);
        await miku_say("サークル詳細取得中にエラーが発生しました。", "idle_think");
    }
}

// 寄合作成処理
async function handleCreateGathering() {
    post_loading();
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${CIRCLE_SERVICE_URL}/api/user-circles`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        // ローディング表示を消す
        let element = document.getElementById('loading');
        if (element) {
            element.remove();
        }

        if (response.ok) {
            const data = await response.json();

            if (data.circles && data.circles.length > 0) {
                let circleText = "<div>【寄合を作成できるサークル】</div>";
                for (let i = 0; i < data.circles.length; i++) {
                    const circle = data.circles[i];
                    circleText += `<div>${i + 1}. ${circle.name}</div>`;
                }

                post_keicho(circleText, SPEAKER.AGENT, person);

                const circleAnswer = await miku_ask("どのサークルの寄合を作成しますか？ 番号でお答えください。（「やめる」で中止できます）", false, "guide_normal");

                if (/やめる|中止|キャンセル/.test(circleAnswer)) {
                    await miku_say("寄合作成をキャンセルしました。", "greeting");
                    return;
                }

                const num = parseInt(circleAnswer.match(/\d+/) || ["0"][0]);

                if (num >= 1 && num <= data.circles.length) {
                    const selectedCircle = data.circles[num - 1];

                    // 寄合のテーマを入力
                    const themeAnswer = await miku_ask("寄合のテーマを教えてください。", false, "guide_normal");
                    if (!themeAnswer || themeAnswer.length < 2) {
                        await miku_say("テーマが短すぎます。最初からやり直してください。", "idle_think");
                        return;
                    }

                    // 日付を選択
                    const dateAnswer = await miku_ask("開催日を教えてください（例: 明日、5月10日など）。", false, "guide_normal");
                    const dateMatch = dateAnswer.match(/(\d+)月(\d+)日/);
                    const now = new Date();
                    let year = now.getFullYear();
                    let month = now.getMonth();
                    let day = now.getDate();

                    if (dateAnswer.includes("明日")) {
                        const tomorrow = new Date();
                        tomorrow.setDate(tomorrow.getDate() + 1);
                        year = tomorrow.getFullYear();
                        month = tomorrow.getMonth();
                        day = tomorrow.getDate();
                    } else if (dateMatch) {
                        month = parseInt(dateMatch[1]) - 1;
                        day = parseInt(dateMatch[2]);
                    } else {
                        await miku_say("日付の形式が正しくありません。最初からやり直してください。", "idle_think");
                        return;
                    }

                    // 時間を選択
                    const timeAnswer = await miku_ask("開始時間を教えてください（例: 14時、午後2時など）。", false, "guide_normal");
                    const timeMatch = timeAnswer.match(/(\d+)時/);
                    let hour = 0;
                    let minute = 0;

                    if (timeMatch) {
                        hour = parseInt(timeMatch[1]);
                        if (timeAnswer.includes("午後") && hour < 12) {
                            hour += 12;
                        }
                    } else {
                        await miku_say("時間の形式が正しくありません。最初からやり直してください。", "idle_think");
                        return;
                    }

                    // 詳細を入力
                    const detailsAnswer = await miku_ask("寄合の詳細を教えてください（任意）。", false, "guide_normal");

                    // 寄合データを作成
                    const gatheringDate = new Date(year, month, day, hour, minute);
                    const gatheringData = {
                        circleId: selectedCircle.id,
                        theme: themeAnswer,
                        datetime: gatheringDate.toISOString(),
                        details: detailsAnswer
                    };

                    await createGathering(gatheringData);
                } else {
                    await miku_say("選択されたサークルがありませんでした。最初からやり直してください。", "idle_think");
                }
            } else {
                await miku_say("寄合を作成できるサークルがありません。サークルに参加してから再試行してください。", "idle_think");
            }
        } else {
            await miku_say("サークル情報の取得に失敗しました。", "idle_think");
        }
    } catch (error) {
        // ローディング表示を消す
        let element = document.getElementById('loading');
        if (element) {
            element.remove();
        }

        console.error("寄合作成処理中にエラーが発生しました:", error);
        await miku_say("寄合作成処理中にエラーが発生しました。", "idle_think");
    }
}

// 寄合を作成する
async function createGathering(gatheringData) {
    post_loading();
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${CIRCLE_SERVICE_URL}/api/gatherings`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(gatheringData)
        });

        // ローディング表示を消す
        let element = document.getElementById('loading');
        if (element) {
            element.remove();
        }

        if (response.ok) {
            const data = await response.json();
            await miku_say(`寄合「${gatheringData.theme}」を作成しました！メンバーに招待が送信されます。`, "greeting");

            let detailText = "<div>【作成された寄合】</div>";
            detailText += `<div>テーマ: ${gatheringData.theme}</div>`;
            detailText += `<div>日時: ${new Date(gatheringData.datetime).toLocaleString('ja-JP')}</div>`;
            if (gatheringData.details) {
                detailText += `<div>詳細: ${gatheringData.details}</div>`;
            }

            post_keicho(detailText, SPEAKER.AGENT, person);
        } else {
            const data = await response.json();
            await miku_say(`寄合の作成に失敗しました: ${data.message}`, "idle_think");
        }
    } catch (error) {
        // ローディング表示を消す
        let element = document.getElementById('loading');
        if (element) {
            element.remove();
        }

        console.error("寄合作成中にエラーが発生しました:", error);
        await miku_say("寄合作成中にエラーが発生しました。", "idle_think");
    }
}

// 寄合確認処理
async function handleCheckGatherings() {
    post_loading();
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${CIRCLE_SERVICE_URL}/api/gatherings`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        // ローディング表示を消す
        let element = document.getElementById('loading');
        if (element) {
            element.remove();
        }

        if (response.ok) {
            const data = await response.json();

            let hasGatherings = false;

            // 参加予定の寄合
            if (data.participatingGatherings && data.participatingGatherings.length > 0) {
                hasGatherings = true;
                let gatheringText = "<div>【参加予定の寄合】</div>";
                for (let i = 0; i < data.participatingGatherings.length; i++) {
                    const gathering = data.participatingGatherings[i];
                    const dateStr = new Date(gathering.datetime).toLocaleString('ja-JP');
                    gatheringText += `<div>${i + 1}. ${dateStr} ${gathering.theme} - ${gathering.circle_name}</div>`;
                }

                post_keicho(gatheringText, SPEAKER.AGENT, person);
            }

            // 招待中の寄合
            if (data.invitedGatherings && data.invitedGatherings.length > 0) {
                hasGatherings = true;
                let invitationText = "<div>【招待中の寄合】</div>";
                let startIdx = data.participatingGatherings ? data.participatingGatherings.length + 1 : 1;
                for (let i = 0; i < data.invitedGatherings.length; i++) {
                    const gathering = data.invitedGatherings[i];
                    const dateStr = new Date(gathering.datetime).toLocaleString('ja-JP');
                    invitationText += `<div>${startIdx + i}. ${dateStr} ${gathering.theme} - ${gathering.circle_name}</div>`;
                }

                post_keicho(invitationText, SPEAKER.AGENT, person);
            }

            if (!hasGatherings) {
                await miku_say("参加予定の寄合はありません。", "guide_normal");
                return;
            }

            const answer = await miku_ask("詳細を確認したい寄合の番号を教えてください。（「やめる」で中止できます）", false, "guide_normal");

            if (/やめる|中止|キャンセル/.test(answer)) {
                await miku_say("寄合確認を終了します。", "greeting");
                return;
            }

            const num = parseInt(answer.match(/\d+/) || ["0"][0]);
            let selectedGathering = null;

            // 参加予定の寄合からの選択
            if (data.participatingGatherings && num <= data.participatingGatherings.length) {
                selectedGathering = data.participatingGatherings[num - 1];
            }
            // 招待中の寄合からの選択
            else if (data.invitedGatherings && num <= data.participatingGatherings.length + data.invitedGatherings.length) {
                const invitedIndex = num - (data.participatingGatherings ? data.participatingGatherings.length + 1 : 1);
                selectedGathering = data.invitedGatherings[invitedIndex];
            }

            if (selectedGathering) {
                await getGatheringDetails(selectedGathering.id);
            } else {
                await miku_say("選択された寄合がありませんでした。", "idle_think");
            }
        } else {
            await miku_say("寄合情報の取得に失敗しました。", "idle_think");
        }
    } catch (error) {
        // ローディング表示を消す
        let element = document.getElementById('loading');
        if (element) {
            element.remove();
        }

        console.error("寄合確認処理中にエラーが発生しました:", error);
        await miku_say("寄合確認処理中にエラーが発生しました。", "idle_think");
    }
}

// 寄合詳細を取得
async function getGatheringDetails(gatheringId) {
    post_loading();
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${CIRCLE_SERVICE_URL}/api/gatherings/${gatheringId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        // ローディング表示を消す
        let element = document.getElementById('loading');
        if (element) {
            element.remove();
        }

        if (response.ok) {
            const data = await response.json();

            let detailText = "<div>【寄合詳細】</div>";
            detailText += `<div>サークル: ${data.gathering.circle_name}</div>`;
            detailText += `<div>テーマ: ${data.gathering.theme}</div>`;
            detailText += `<div>日時: ${new Date(data.gathering.datetime).toLocaleString('ja-JP')}</div>`;
            if (data.gathering.details) {
                detailText += `<div>内容: ${data.gathering.details}</div>`;
            }

            post_keicho(detailText, SPEAKER.AGENT, person);

            // 参加URL表示
            if (data.gathering.url) {
                let urlText = "<div>【寄合に参加するためのURL】</div>";
                urlText += `<div>${data.gathering.url}</div>`;
                urlText += "<div>※このURLをブラウザで開くと寄合に参加できます</div>";

                post_keicho(urlText, SPEAKER.AGENT, person);
            }

            // 招待中の寄合であれば参加するか尋ねる
            if (data.userStatus === 'invited') {
                const responseAnswer = await miku_ask("この招待に返信しますか？ 「参加する」「参加しない」「後で決める」からお選びください。", false, "guide_normal");

                if (/参加する/.test(responseAnswer)) {
                    await respondToInvitation(gatheringId, 'accepted');
                } else if (/参加しない/.test(responseAnswer)) {
                    await respondToInvitation(gatheringId, 'declined');
                } else {
                    await miku_say("後で返信することにしました。", "greeting");
                }
            }
        } else {
            await miku_say("寄合詳細の取得に失敗しました。", "idle_think");
        }
    } catch (error) {
        // ローディング表示を消す
        let element = document.getElementById('loading');
        if (element) {
            element.remove();
        }

        console.error("寄合詳細取得中にエラーが発生しました:", error);
        await miku_say("寄合詳細取得中にエラーが発生しました。", "idle_think");
    }
}

// 招待の返信処理
async function handleInvitationResponse() {
    post_loading();
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${CIRCLE_SERVICE_URL}/api/invitations`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        // ローディング表示を消す
        let element = document.getElementById('loading');
        if (element) {
            element.remove();
        }

        if (response.ok) {
            const data = await response.json();

            if (data.invitations && data.invitations.length > 0) {
                let invitationText = "<div>【未回答の寄合招待】</div>";
                for (let i = 0; i < data.invitations.length; i++) {
                    const invitation = data.invitations[i];
                    const dateStr = new Date(invitation.datetime).toLocaleString('ja-JP');
                    invitationText += `<div>${i + 1}. ${dateStr} ${invitation.theme} - ${invitation.circle_name}</div>`;
                }

                post_keicho(invitationText, SPEAKER.AGENT, person);

                const answer = await miku_ask("どの招待に返信しますか？ 番号でお答えください。（「やめる」で中止できます）", false, "guide_normal");

                if (/やめる|中止|キャンセル/.test(answer)) {
                    await miku_say("招待の確認をキャンセルしました。", "greeting");
                    return;
                }

                const num = parseInt(answer.match(/\d+/) || ["0"][0]);

                if (num >= 1 && num <= data.invitations.length) {
                    const selectedInvitation = data.invitations[num - 1];

                    const responseAnswer = await miku_ask("この招待に返信しますか？ 「参加する」「参加しない」「後で決める」からお選びください。", false, "guide_normal");

                    if (/参加する/.test(responseAnswer)) {
                        await respondToInvitation(selectedInvitation.id, 'accepted');
                    } else if (/参加しない/.test(responseAnswer)) {
                        await respondToInvitation(selectedInvitation.id, 'declined');
                    } else {
                        await miku_say("後で返信することにしました。", "greeting");
                    }
                } else {
                    await miku_say("選択された招待がありませんでした。", "idle_think");
                }
            } else {
                await miku_say("未回答の招待はありません。", "greeting");
            }
        } else {
            await miku_say("招待情報の取得に失敗しました。", "idle_think");
        }
    } catch (error) {
        // ローディング表示を消す
        let element = document.getElementById('loading');
        if (element) {
            element.remove();
        }

        console.error("招待確認処理中にエラーが発生しました:", error);
        await miku_say("招待確認処理中にエラーが発生しました。", "idle_think");
    }
}

// 招待に返信する
async function respondToInvitation(invitationId, status) {
    post_loading();
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${CIRCLE_SERVICE_URL}/api/invitations/${invitationId}/respond`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ status })
        });

        // ローディング表示を消す
        let element = document.getElementById('loading');
        if (element) {
            element.remove();
        }

        if (response.ok) {
            if (status === 'accepted') {
                await miku_say("招待を承諾しました。参加者リストに追加されました。", "greeting");
            } else {
                await miku_say("招待を辞退しました。主催者に通知されます。", "greeting");
            }

            // 招待をチェックして通知状態を更新
            await checkCircleNotifications();
        } else {
            const data = await response.json();
            await miku_say(`招待への返信に失敗しました: ${data.message}`, "idle_think");
        }
    } catch (error) {
        // ローディング表示を消す
        let element = document.getElementById('loading');
        if (element) {
            element.remove();
        }

        console.error("招待返信処理中にエラーが発生しました:", error);
        await miku_say("招待返信処理中にエラーが発生しました。", "idle_think");
    }
}

// 寄合通知をチェックする関数（定期的に実行される）
async function checkCircleNotifications() {
    console.log("寄合通知チェック実行");

    try {
        // 招待のチェック
        const token = localStorage.getItem('token');
        const invitationsResponse = await fetch(`${CIRCLE_SERVICE_URL}/api/invitations`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (invitationsResponse.ok) {
            const data = await invitationsResponse.json();
            // 現在時刻より後の寄合招待のみをフィルタリング
            const futureInvitations = data.invitations.filter(invitation =>
                new Date(invitation.datetime) > new Date()
            );

            window.invitations = futureInvitations;
            window.hasUnreadInvitations = futureInvitations.length > 0;
            window.unreadInvitationsCount = futureInvitations.length;
        }

        // 近日中の寄合をチェック
        const upcomingResponse = await fetch(`${CIRCLE_SERVICE_URL}/api/upcoming-gatherings`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (upcomingResponse.ok) {
            const data = await upcomingResponse.json();
            // 30分以内に開始する寄合のみフィルタリング
            const now = new Date();
            const upcoming = data.upcomingGatherings.filter(gathering => {
                const gatheringTime = new Date(gathering.datetime);
                const diffMinutes = (gatheringTime - now) / (1000 * 60);
                return diffMinutes <= 30 && diffMinutes >= 0;
            });

            window.upcomingGatherings = upcoming;
            window.hasUpcomingGatherings = upcoming.length > 0;
            window.upcomingGatheringsCount = upcoming.length;
        }
    } catch (error) {
        console.error("寄合通知チェック中にエラーが発生しました:", error);
    }
}

// 定期的に通知をチェック
setInterval(checkCircleNotifications, 5 * 60 * 1000); // 5分ごとにチェック

// 初回通知チェック
checkCircleNotifications();

// 連携サービスとして登録（service.jsのapps配列に追加）
apps.push({
    name: circleService.name,
    keyword: circleService.keyword,
    description: circleService.description,
    func: circleService.func
});

console.log("オンラインサークルサービスが初期化されました");