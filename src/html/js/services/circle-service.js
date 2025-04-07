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

// オンラインサークルサービスのメイン処理
async function handleCircleService() {
    try {
        // サービスフラグを立てる
        serviceFlag = true;

        // 未読の招待があるかチェック
        const invitations = await checkInvitations();
        if (invitations && invitations.length > 0) {
            await notifyInvitations(invitations);
        }

        // 開始予定の寄合があるかチェック
        const upcomingGatherings = await checkUpcomingGatherings();
        if (upcomingGatherings && upcomingGatherings.length > 0) {
            await notifyUpcomingGatherings(upcomingGatherings);
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
    menuText += "<div>5. オンラインサークルをブラウザで開く</div>";

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
        } else if (/5|ブラウザ|開く/.test(choice)) {
            await openCircleServiceInBrowser();
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

// 未読の招待をチェック
async function checkInvitations() {
    try {
        const token = localStorage.getItem('circleToken');
        if (!token) {
            console.log("ログインしていません");
            return [];
        }

        const response = await fetch(`${CIRCLE_SERVICE_URL}/api/invitations`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            // 現在時刻より後の寄合のみをフィルタリング
            const futureInvitations = data.invitations.filter(invitation =>
                new Date(invitation.datetime) > new Date()
            );
            return futureInvitations;
        }
        return [];
    } catch (error) {
        console.error("招待の取得に失敗しました:", error);
        return [];
    }
}

// 招待を通知
async function notifyInvitations(invitations) {
    if (invitations.length === 0) return;

    const invitationText = `${invitations.length}件の寄合への招待が届いています。`;
    await miku_say(invitationText, "greeting");

    let detailText = "<div>【未回答の寄合招待】</div>";
    for (let i = 0; i < invitations.length && i < 3; i++) {
        const inv = invitations[i];
        const dateStr = new Date(inv.datetime).toLocaleString('ja-JP');
        detailText += `<div>・${inv.theme}（${dateStr}）</div>`;
    }

    if (invitations.length > 3) {
        detailText += "<div>他、" + (invitations.length - 3) + "件</div>";
    }

    post_keicho(detailText, SPEAKER.AGENT, person);

    const answer = await miku_ask("招待の詳細を確認しますか？", false, "guide_normal");
    if (/はい|確認|見る/.test(answer)) {
        await handleInvitationResponse();
    }
}

// 近日中の寄合をチェック
async function checkUpcomingGatherings() {
    try {
        const token = localStorage.getItem('circleToken');
        if (!token) {
            console.log("ログインしていません");
            return [];
        }

        const response = await fetch(`${CIRCLE_SERVICE_URL}/api/upcoming-gatherings`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            // 30分以内に開始する寄合のみフィルタリング
            const now = new Date();
            const upcomingGatherings = data.upcomingGatherings.filter(gathering => {
                const gatheringTime = new Date(gathering.datetime);
                const diffMinutes = (gatheringTime - now) / (1000 * 60);
                return diffMinutes <= 30 && diffMinutes >= 0;
            });
            return upcomingGatherings;
        }
        return [];
    } catch (error) {
        console.error("近日中の寄合の取得に失敗しました:", error);
        return [];
    }
}

// 近日中の寄合を通知
async function notifyUpcomingGatherings(gatherings) {
    if (gatherings.length === 0) return;

    let gatheringText = "";
    if (gatherings.length === 1) {
        const gathering = gatherings[0];
        const gatheringTime = new Date(gathering.datetime);
        const now = new Date();
        const diffMinutes = Math.floor((gatheringTime - now) / (1000 * 60));

        gatheringText = `「${gathering.theme}」の寄合がまもなく始まります。（あと約${diffMinutes}分）`;
    } else {
        gatheringText = `${gatherings.length}件の寄合がまもなく始まります。`;
    }

    await miku_say(gatheringText, "greeting");

    if (gatherings.length > 1) {
        let detailText = "<div>【まもなく始まる寄合】</div>";
        for (const gathering of gatherings) {
            const gatheringTime = new Date(gathering.datetime);
            const now = new Date();
            const diffMinutes = Math.floor((gatheringTime - now) / (1000 * 60));
            detailText += `<div>・${gathering.theme}（あと約${diffMinutes}分）</div>`;
        }
        post_keicho(detailText, SPEAKER.AGENT, person);
    }

    const answer = await miku_ask("寄合に参加しますか？", false, "guide_normal");
    if (/はい|参加|する/.test(answer)) {
        if (gatherings.length === 1) {
            // 単一の寄合の場合は直接そのURLを開く
            await openGatheringPage(gatherings[0].id);
        } else {
            // 複数ある場合は選択してもらう
            await selectAndOpenGathering(gatherings);
        }
    }
}

// 寄合を選択して開く
async function selectAndOpenGathering(gatherings) {
    let gatheringText = "<div>【参加する寄合を選んでください】</div>";
    for (let i = 0; i < gatherings.length; i++) {
        const gathering = gatherings[i];
        const dateStr = new Date(gathering.datetime).toLocaleString('ja-JP', {
            hour: '2-digit',
            minute: '2-digit'
        });
        gatheringText += `<div>${i + 1}. ${gathering.theme}（${dateStr}）</div>`;
    }

    post_keicho(gatheringText, SPEAKER.AGENT, person);

    const answer = await miku_ask("参加する寄合の番号を教えてください。", false, "guide_normal");
    const num = parseInt(answer.match(/\d+/));

    if (num >= 1 && num <= gatherings.length) {
        await openGatheringPage(gatherings[num - 1].id);
    } else {
        await miku_say("有効な番号が選択されなかったため、操作をキャンセルします。", "greeting");
    }
}

// サークル参加処理
async function handleJoinCircle() {
    await miku_say("サークル参加ページを開きます。ブラウザでログインしてサークルに参加してください。", "greeting");
    window.open(`${CIRCLE_SERVICE_URL}/join-circle`, "_blank");
    await sleep(2000);
    await miku_ask("サークルへの参加が完了したら教えてください。", false, "greeting");
}

// サークル確認処理
async function handleCheckCircles() {
    await miku_say("参加中のサークル一覧ページを開きます。", "greeting");
    window.open(`${CIRCLE_SERVICE_URL}/check-circles`, "_blank");
    await sleep(2000);
    await miku_ask("サークルの確認が終わったら教えてください。", false, "greeting");
}

// 寄合作成処理
async function handleCreateGathering() {
    await miku_say("寄合作成ページを開きます。ブラウザでログインして寄合を作成してください。", "greeting");
    window.open(`${CIRCLE_SERVICE_URL}/create-gathering`, "_blank");
    await sleep(2000);
    await miku_ask("寄合の作成が完了したら教えてください。", false, "greeting");
}

// 寄合確認処理
async function handleCheckGatherings() {
    await miku_say("寄合一覧ページを開きます。", "greeting");
    window.open(`${CIRCLE_SERVICE_URL}/gathering-list`, "_blank");
    await sleep(2000);
    await miku_ask("寄合の確認が終わったら教えてください。", false, "greeting");
}

// 招待の返信処理
async function handleInvitationResponse() {
    await miku_say("招待確認ページを開きます。", "greeting");
    window.open(`${CIRCLE_SERVICE_URL}/check-invitations`, "_blank");
    await sleep(2000);
    await miku_ask("招待への返信が完了したら教えてください。", false, "greeting");
}

// 寄合ページを開く
async function openGatheringPage(gatheringId) {
    await miku_say("寄合ページを開きます。", "greeting");
    window.open(`${CIRCLE_SERVICE_URL}/gathering/${gatheringId}`, "_blank");
    await sleep(2000);
    await miku_ask("寄合への参加が完了したら教えてください。", false, "greeting");
}

// オンラインサークルサービスをブラウザで開く
async function openCircleServiceInBrowser() {
    await miku_say("オンラインサークルサービスをブラウザで開きます。", "greeting");
    window.open(CIRCLE_SERVICE_URL, "_blank");
    await sleep(2000);
    await miku_ask("オンラインサークルサービスの利用が終わったら教えてください。", false, "greeting");
}

// 連携サービスとして登録（service.jsのapps配列に追加）
apps.push({
    name: circleService.name,
    keyword: circleService.keyword,
    description: circleService.description,
    func: circleService.func
});

console.log("オンラインサークルサービスが初期化されました");