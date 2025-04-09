/**
 * circle-service.js
 * PCメイちゃんとオンラインサークルを連携するためのスクリプト
 */

// オンラインサークルサービスの定義
const circleService = {
    name: "オンラインサークル",
    keyword: "サークル",
    description: "オンラインでサークル活動や寄合を楽しめるサービス",
    func: async function () { await handleCircleService(); },
};

// サークルサービスのメイン処理
async function handleCircleService() {
    // サービスフラグを立てる
    serviceFlag = true;

    // 未読の招待や近日中の寄合があるかチェック
    const hasUnreadInvitations = await checkUnreadInvitations();
    const hasUpcomingGatherings = await checkUpcomingGatherings();

    // 招待がある場合は優先して通知
    if (hasUnreadInvitations) {
        await notifyInvitations();
    }

    // 開始予定の寄合があるかチェック
    if (hasUpcomingGatherings) {
        await notifyUpcomingGatherings();
    }

    // メインメニューを表示
    await showServiceMainMenu();
}

// 未読の招待をチェック
async function checkUnreadInvitations() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            await miku_say("オンラインサークルサービスにログインしていません。あらかじめログインしておいてください。", "idle_think");
            return false;
        }

        const response = await fetch('https://es4.eedept.kobe-u.ac.jp/online-circle/api/invitations', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            // 現在時刻より後の寄合招待のみをフィルタリング
            const futureInvitations = data.invitations.filter(invitation =>
                new Date(invitation.datetime) > new Date()
            );

            return futureInvitations.length > 0;
        }
        return false;
    } catch (error) {
        console.error('招待チェック中にエラーが発生しました:', error);
        return false;
    }
}

// 近日中の寄合をチェック
async function checkUpcomingGatherings() {
    try {
        const token = localStorage.getItem('token');
        if (!token) return false;

        const response = await fetch('https://es4.eedept.kobe-u.ac.jp/online-circle/api/upcoming-gatherings', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            // 30分以内に開始する寄合のみフィルタリング
            const now = new Date();
            const upcoming = data.upcomingGatherings.filter(gathering => {
                const gatheringTime = new Date(gathering.datetime);
                const diffMinutes = (gatheringTime - now) / (1000 * 60);
                return diffMinutes <= 10 && diffMinutes >= -5;
            });

            return upcoming.length > 0;
        }
        return false;
    } catch (error) {
        console.error('寄合チェック中にエラーが発生しました:', error);
        return false;
    }
}

// 招待を通知
async function notifyInvitations() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('https://es4.eedept.kobe-u.ac.jp/online-circle/api/invitations', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            // 現在時刻より後の寄合招待のみをフィルタリング
            const futureInvitations = data.invitations.filter(invitation =>
                new Date(invitation.datetime) > new Date()
            );

            if (futureInvitations.length > 0) {
                // 招待を表示
                let str = `<div style="background-color:#f0f7ff;padding:15px;border-radius:10px;border-left:4px solid #4a90e2;margin:10px 0;">
                           <div style="font-size:18px;font-weight:bold;margin-bottom:10px;">📩 未回答の寄合招待 (${futureInvitations.length}件)</div>`;

                for (let i = 0; i < futureInvitations.length; i++) {
                    const inv = futureInvitations[i];
                    const dateStr = new Date(inv.datetime).toLocaleString('ja-JP');
                    str += `<div style="padding:8px;margin-bottom:5px;background-color:white;border-radius:5px;">
                            ${i + 1}. ${inv.theme}（${dateStr}）- ${inv.circle_name}</div>`;
                }

                str += `</div>`;
                post_keicho(str, SPEAKER.AGENT, person);

                // ユーザーに招待への応答を促す
                const answer = await miku_ask("これらの招待に応答しますか？（はい/いいえ）");
                if (/はい|おねがい|お願い|頼む|頼みます/.test(answer)) {
                    await handleInvitationResponses(futureInvitations);
                }
            }
        }
    } catch (error) {
        console.error('招待通知中にエラーが発生しました:', error);
    }
}

// 招待への応答を処理
async function handleInvitationResponses(invitations) {
    for (let i = 0; i < invitations.length; i++) {
        const inv = invitations[i];
        const dateStr = new Date(inv.datetime).toLocaleString('ja-JP');

        await miku_say(`「${inv.theme}」（${dateStr}）への招待です。`, "smile");
        const answer = await miku_ask("参加しますか？（参加する/参加しない/後で決める）");

        if (/参加|する|はい|yes/.test(answer)) {
            // 参加する場合
            try {
                const token = localStorage.getItem('token');
                const response = await fetch(`https://es4.eedept.kobe-u.ac.jp/online-circle/api/invitations/${inv.id}/respond`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ status: 'accepted' })
                });

                if (response.ok) {
                    await miku_say("参加登録が完了しました！", "greeting");
                } else {
                    await miku_say("参加登録に失敗しました。後でもう一度お試しください。", "idle_think");
                }
            } catch (error) {
                console.error('招待応答中にエラーが発生しました:', error);
                await miku_say("応答処理中にエラーが発生しました。", "idle_think");
            }
        }
        else if (/参加しない|不参加|no|いいえ/.test(answer)) {
            // 参加しない場合
            try {
                const token = localStorage.getItem('token');
                const response = await fetch(`https://es4.eedept.kobe-u.ac.jp/online-circle/api/invitations/${inv.id}/respond`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ status: 'declined' })
                });

                if (response.ok) {
                    await miku_say("不参加の登録が完了しました。", "greeting");
                } else {
                    await miku_say("不参加登録に失敗しました。後でもう一度お試しください。", "idle_think");
                }
            } catch (error) {
                console.error('招待応答中にエラーが発生しました:', error);
                await miku_say("応答処理中にエラーが発生しました。", "idle_think");
            }
        }
        else {
            // 後で決める場合
            await miku_say("また後で決めましょう。", "smile");
        }
    }
}

// 近日中の寄合を通知
async function notifyUpcomingGatherings() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('https://es4.eedept.kobe-u.ac.jp/online-circle/api/upcoming-gatherings', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            // 30分以内に開始する寄合のみフィルタリング
            // 10分以内、5分後までをフィルタリングするように変更すべき？
            const now = new Date();
            const upcoming = data.upcomingGatherings.filter(gathering => {
                const gatheringTime = new Date(gathering.datetime);
                const diffMinutes = (gatheringTime - now) / (1000 * 60);
                return diffMinutes <= 30 && diffMinutes >= 0;
            });

            if (upcoming.length > 0) {
                // 通知
                let str = `<div style="background-color:#fff3e0;padding:15px;border-radius:10px;border-left:4px solid #ff9800;margin:10px 0;">
                           <div style="font-size:18px;font-weight:bold;margin-bottom:10px;">⏰ まもなく始まる寄合</div>`;

                for (const gathering of upcoming) {
                    const gatheringTime = new Date(gathering.datetime);
                    const diffMinutes = Math.floor((gatheringTime - now) / (1000 * 60));
                    str += `<div style="padding:8px;margin-bottom:5px;background-color:white;border-radius:5px;">
                            ・${gathering.theme}（あと約${diffMinutes}分）</div>`;
                }

                str += `</div>`;
                post_keicho(str, SPEAKER.AGENT, person);

                // 参加を促す
                if (upcoming.length === 1) {
                    await miku_say(`まもなく「${upcoming[0].theme}」の寄合が始まります。`, "greeting");

                    let validResponse = false;

                    while (!validResponse) {
                        const answer = await miku_ask("参加情報を表示しますか？（はい/いいえ）");

                        if (/はい|参加|する|見る|表示/.test(answer)) {
                            validResponse = true;
                            await displayGatheringInfo(upcoming[0].id);
                        }
                        else if (/いいえ|参加しない|いや|やめる|後で/.test(answer)) {
                            validResponse = true;
                            await miku_say("わかりました。また後でご案内します。", "greeting");
                        }
                        else {
                            await miku_say("「はい」か「いいえ」でお答えください。", "idle_think");
                        }
                    }
                } else {
                    await miku_say("まもなく複数の寄合が始まります。参加情報を表示しますか？", "greeting");

                    let validResponse = false;

                    while (!validResponse) {
                        const answer = await miku_ask("はい/いいえ、または寄合の番号を教えてください（1, 2, ...）");

                        if (/いいえ|参加しない|いや|やめる|後で|no/.test(answer)) {
                            validResponse = true;
                            await miku_say("わかりました。また後でご案内します。", "greeting");
                        }
                        else if (/はい|参加|する|見る|表示|yes/.test(answer)) {
                            validResponse = true;
                            // 全ての寄合情報を表示
                            for (const gathering of upcoming) {
                                await displayGatheringInfo(gathering.id);
                            }
                        }
                        else {
                            // 番号を解析
                            const num = parseInt(answer.match(/\d+/) || ["0"][0]);
                            if (num >= 1 && num <= upcoming.length) {
                                validResponse = true;
                                await displayGatheringInfo(upcoming[num - 1].id);
                            } else {
                                await miku_say(`1から${upcoming.length}の番号、または「はい」「いいえ」でお答えください。`, "idle_think");
                            }
                        }
                    }
                }
            }
        }
    } catch (error) {
        console.error('寄合通知中にエラーが発生しました:', error);
    }
}

// 寄合情報を表示
async function displayGatheringInfo(gatheringId) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`https://es4.eedept.kobe-u.ac.jp/online-circle/api/gatherings/${gatheringId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            const gathering = data.gathering;

            // 参加者情報取得
            const participantsResponse = await fetch(`https://es4.eedept.kobe-u.ac.jp/online-circle/api/gatherings/${gatheringId}/participants`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            let participantsInfo = "";
            if (participantsResponse.ok) {
                const participantsData = await participantsResponse.json();
                const acceptedParticipants = participantsData.participants.filter(p => p.status === 'accepted');

                participantsInfo = `<div style="margin-top:10px;padding:8px;background-color:#f5f5f5;border-radius:5px;">
                                    <div style="font-weight:bold;">参加者 (${acceptedParticipants.length}人)</div>
                                    <div style="display:flex;flex-wrap:wrap;gap:5px;margin-top:5px;">`;

                for (const participant of acceptedParticipants.slice(0, 5)) {
                    participantsInfo += `<span style="background-color:#e3f2fd;padding:3px 8px;border-radius:10px;font-size:14px;">
                                        👤 ${participant.display_name}</span>`;
                }

                if (acceptedParticipants.length > 5) {
                    participantsInfo += `<span style="background-color:#e3f2fd;padding:3px 8px;border-radius:10px;font-size:14px;">
                                        +${acceptedParticipants.length - 5}人</span>`;
                }

                participantsInfo += `</div></div>`;
            }

            // 寄合情報を表示
            const gatheringTime = new Date(gathering.datetime);
            let infoStr = `<div style="background-color:#e8f5e9;padding:15px;border-radius:10px;border-left:4px solid #4caf50;margin:10px 0;">
                          <div style="font-size:18px;font-weight:bold;margin-bottom:10px;">
                          📅 寄合情報: ${gathering.theme}</div>
                          <div style="padding:10px;background-color:white;border-radius:8px;margin-bottom:10px;">
                            <div style="display:flex;align-items:center;margin-bottom:5px;">
                              <span style="font-weight:bold;min-width:80px;">サークル:</span> ${gathering.circle_name}
                            </div>
                            <div style="display:flex;align-items:center;margin-bottom:5px;">
                              <span style="font-weight:bold;min-width:80px;">日時:</span> ${gatheringTime.toLocaleString('ja-JP')}
                            </div>`;

            if (gathering.details) {
                infoStr += `<div style="margin-top:10px;">
                            <div style="font-weight:bold;margin-bottom:5px;">詳細:</div>
                            <div style="padding:8px;background-color:#f9f9f9;border-radius:5px;">${gathering.details}</div>
                          </div>`;
            }

            infoStr += participantsInfo;

            if (gathering.url) {
                infoStr += `<div style="margin-top:15px;text-align:center;">
                            <a href="${gathering.url}" target="_blank" style="display:inline-block;background-color:#ff9800;color:white;padding:10px 15px;border-radius:5px;font-weight:bold;text-decoration:none;">
                              ここをクリックして寄合に参加する
                            </a>
                            <div style="font-size:12px;margin-top:5px;color:#666;">
                              ※新しいウィンドウで開きます
                            </div>
                          </div>`;
            }

            infoStr += `</div></div>`;

            post_keicho(infoStr, SPEAKER.AGENT, person);
        } else {
            await miku_say("寄合情報の取得に失敗しました。", "idle_think");
        }
    } catch (error) {
        console.error('寄合情報表示中にエラーが発生しました:', error);
        await miku_say("寄合情報の表示中にエラーが発生しました。", "idle_think");
    }
}

// メインメニュー表示
async function showServiceMainMenu() {
    // メニューの表示（テキスト + アイコンで見やすく）
    let menuText = `<div style="background-color:#f5f5f5;padding:15px;border-radius:10px;margin:10px 0;">
                    <div style="font-size:20px;font-weight:bold;margin-bottom:15px;text-align:center;">🔍 オンラインサークルサービス</div>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                        <div style="background-color:white;padding:12px;border-radius:8px;border-left:4px solid #4a90e2;">
                            <div style="font-weight:bold;">1. 📝 サークルに参加する</div>
                            <div style="font-size:14px;color:#666;">新しいサークル活動を始めよう</div>
                        </div>
                        <div style="background-color:white;padding:12px;border-radius:8px;border-left:4px solid #4a90e2;">
                            <div style="font-weight:bold;">2. 👥 参加中のサークルを確認する</div>
                            <div style="font-size:14px;color:#666;">所属サークルをチェック</div>
                        </div>
                        <div style="background-color:white;padding:12px;border-radius:8px;border-left:4px solid #4a90e2;">
                            <div style="font-weight:bold;">3. 📅 寄合を作成する</div>
                            <div style="font-size:14px;color:#666;">新しい寄合を企画しよう</div>
                        </div>
                        <div style="background-color:white;padding:12px;border-radius:8px;border-left:4px solid #4a90e2;">
                            <div style="font-weight:bold;">4. 📋 寄合一覧を確認する</div>
                            <div style="font-size:14px;color:#666;">参加予定の寄合をチェック</div>
                        </div>
                    </div>
                    </div>`;

    post_keicho(menuText, SPEAKER.AGENT, person);

    // ユーザーの選択を受け付ける
    let selectedOption = false;
    let count = 0;

    while (!selectedOption && count < 3) {
        const answer = await miku_ask("何をしますか？ 番号または項目名でお答えください。（終了する場合は「終わり」と言ってください）");
        count++;

        if (/1|参加する|サークルに参加/.test(answer)) {
            await handleJoinCircle();
            selectedOption = true;
        }
        else if (/2|確認する|参加中|サークルを確認/.test(answer)) {
            await handleCheckCircles();
            selectedOption = true;
        }
        else if (/3|作成する|寄合を作成/.test(answer)) {
            await handleCreateGathering();
            selectedOption = true;
        }
        else if (/4|寄合一覧|寄合を確認/.test(answer)) {
            await handleCheckGatherings();
            selectedOption = true;
        }
        else if (/終了|終わり|やめる/.test(answer)) {
            await miku_say("オンラインサークルサービスを終了します。また何かあればお声かけください。", "bye");
            serviceFlag = false;
            return;
        }
        else {
            await miku_say("すみません、選択肢から選んでください。", "idle_think");
        }
    }

    if (!selectedOption) {
        await miku_say("選択肢から選ばれなかったため、サービスを終了します。", "greeting");
    }

    serviceFlag = false;
}

// サークル参加の処理 - 対話内に表示するよう修正
async function handleJoinCircle() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('https://es4.eedept.kobe-u.ac.jp/online-circle/api/circles?type=join', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const data = await response.json();

            if (data.circles && data.circles.length > 0) {
                // 参加可能なサークル一覧を表示
                let circlesStr = `<div style="background-color:#e3f2fd;padding:15px;border-radius:10px;margin:10px 0;">
                                 <div style="font-size:18px;font-weight:bold;margin-bottom:10px;">
                                 👥 参加可能なサークル (${data.circles.length}件)</div>`;

                for (let i = 0; i < data.circles.length; i++) {
                    const circle = data.circles[i];

                    // ジャンルに応じたアイコンを設定
                    let genreIcon = '✨';
                    switch (circle.genre) {
                        case 'スポーツ': genreIcon = '⚽'; break;
                        case '音楽': genreIcon = '🎵'; break;
                        case '芸術': genreIcon = '🎨'; break;
                        case '学習': genreIcon = '📚'; break;
                    }

                    circlesStr += `<div style="padding:10px;background-color:white;border-radius:8px;margin-bottom:10px;">
                                  <div style="font-size:16px;font-weight:bold;margin-bottom:5px;display:flex;align-items:center;">
                                    <span style="font-size:1.2em;margin-right:8px;">${genreIcon}</span>
                                    ${i + 1}. ${circle.name}
                                  </div>
                                  <div style="padding:5px 10px;background-color:#f5f5f5;border-radius:5px;margin-bottom:5px;">
                                    <span style="font-weight:bold;">テーマ:</span> ${circle.theme}
                                  </div>
                                  <div style="padding:5px 10px;background-color:#f5f5f5;border-radius:5px;">
                                    <span style="font-weight:bold;">ジャンル:</span> ${circle.genre}
                                  </div>
                                  ${circle.details ? `<div style="margin-top:5px;padding:5px 10px;font-size:14px;color:#666;">${circle.details}</div>` : ''}
                                </div>`;
                }

                circlesStr += `</div>`;
                post_keicho(circlesStr, SPEAKER.AGENT, person);

                // サークル選択と参加
                const answer = await miku_ask("参加したいサークルの番号を教えてください。または「やめる」で中止できます。");

                if (/やめる|中止|キャンセル/.test(answer)) {
                    await miku_say("サークル参加をキャンセルしました。", "greeting");
                    return;
                }

                const num = parseInt(answer.match(/\d+/) || ["0"][0]);

                if (num >= 1 && num <= data.circles.length) {
                    const selectedCircle = data.circles[num - 1];

                    // サークルに参加
                    const joinResponse = await fetch(`https://es4.eedept.kobe-u.ac.jp/online-circle/api/circles/${selectedCircle.id}/join`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });

                    if (joinResponse.ok) {
                        await miku_say(`「${selectedCircle.name}」サークルへの参加が完了しました！`, "greeting");
                    } else {
                        const errorData = await joinResponse.json();
                        await miku_say(`サークル参加に失敗しました: ${errorData.message}`, "idle_think");
                    }
                } else {
                    await miku_say("有効な番号が選択されませんでした。", "idle_think");
                }
            } else {
                await miku_say("現在参加可能なサークルがありません。新しいサークルを作成しますか？", "guide_normal");

                const createAnswer = await miku_ask("「はい」または「いいえ」でお答えください。", false, "guide_normal");

                if (/はい|作成|する/.test(createAnswer)) {
                    await handleCreateCircle();
                }
            }
        } else {
            await miku_say("サークル情報の取得に失敗しました。", "idle_think");
        }
    } catch (error) {
        console.error('サークル参加処理中にエラーが発生しました:', error);
        await miku_say("サークル参加処理中にエラーが発生しました。", "idle_think");
    }
}

// サークル確認の処理 - 対話内に表示するよう修正
// サークル確認の処理 - 対話内に表示するよう修正
async function handleCheckCircles() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('https://es4.eedept.kobe-u.ac.jp/online-circle/api/circles?type=check', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const data = await response.json();

            if (data.circles && data.circles.length > 0) {
                // 参加中のサークル一覧を表示
                let circlesStr = `<div style="background-color:#e8f5e9;padding:15px;border-radius:10px;margin:10px 0;">
                                 <div style="font-size:18px;font-weight:bold;margin-bottom:10px;">
                                 👥 参加中のサークル (${data.circles.length}件)</div>`;

                for (let i = 0; i < data.circles.length; i++) {
                    const circle = data.circles[i];

                    // ジャンルに応じたアイコンを設定
                    let genreIcon = '✨';
                    switch (circle.genre) {
                        case 'スポーツ': genreIcon = '⚽'; break;
                        case '音楽': genreIcon = '🎵'; break;
                        case '芸術': genreIcon = '🎨'; break;
                        case '学習': genreIcon = '📚'; break;
                    }

                    circlesStr += `<div style="padding:10px;background-color:white;border-radius:8px;margin-bottom:10px;">
                                  <div style="font-size:16px;font-weight:bold;margin-bottom:5px;display:flex;align-items:center;">
                                    <span style="font-size:1.2em;margin-right:8px;">${genreIcon}</span>
                                    ${i + 1}. ${circle.name}
                                  </div>
                                  <div style="padding:5px 10px;background-color:#f5f5f5;border-radius:5px;margin-bottom:5px;">
                                    <span style="font-weight:bold;">テーマ:</span> ${circle.theme}
                                  </div>
                                  <div style="padding:5px 10px;background-color:#f5f5f5;border-radius:5px;">
                                    <span style="font-weight:bold;">ジャンル:</span> ${circle.genre}
                                  </div>
                                  ${circle.details ? `<div style="margin-top:5px;padding:5px 10px;font-size:14px;color:#666;">${circle.details}</div>` : ''}
                                </div>`;
                }

                circlesStr += `</div>`;
                post_keicho(circlesStr, SPEAKER.AGENT, person);

                // サークル詳細表示のオプション
                let validSelection = false;

                while (!validSelection) {
                    const answer = await miku_ask("詳しく知りたいサークルの番号を教えてください。または「やめる」で終了できます。");

                    if (/やめる|終了|中止|キャンセル/.test(answer)) {
                        await miku_say("サークル確認を終了します。", "greeting");
                        return;
                    }

                    const num = parseInt(answer.match(/\d+/) || ["0"][0]);

                    if (num >= 1 && num <= data.circles.length) {
                        validSelection = true;
                        const selectedCircle = data.circles[num - 1];
                        await displayCircleDetails(selectedCircle.id);
                    } else {
                        // 無効な選択の場合は、エラーメッセージを表示して再度選択を促す
                        await miku_say(`有効な番号を選んでください（1から${data.circles.length}の間）。もう一度お試しください。`, "idle_think");
                    }
                }
            } else {
                await miku_say("参加しているサークルがありません。新しいサークルに参加しませんか？", "guide_normal");

                const joinAnswer = await miku_ask("「はい」または「いいえ」でお答えください。", false, "guide_normal");

                if (/はい|参加|する/.test(joinAnswer)) {
                    await handleJoinCircle();
                }
            }
        } else {
            await miku_say("サークル情報の取得に失敗しました。", "idle_think");
        }
    } catch (error) {
        console.error('サークル確認処理中にエラーが発生しました:', error);
        await miku_say("サークル確認処理中にエラーが発生しました。", "idle_think");
    }
}

// サークル詳細を表示
// サークル詳細を表示
async function displayCircleDetails(circleId) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`https://es4.eedept.kobe-u.ac.jp/online-circle/api/circles/${circleId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            const circle = data.circle;
            const members = data.members;

            // ジャンルに応じたアイコンを設定
            let genreIcon = '✨';
            switch (circle.genre) {
                case 'スポーツ': genreIcon = '⚽'; break;
                case '音楽': genreIcon = '🎵'; break;
                case '芸術': genreIcon = '🎨'; break;
                case '学習': genreIcon = '📚'; break;
            }

            // サークル詳細を表示
            let detailsStr = `<div style="background-color:#e3f2fd;padding:15px;border-radius:10px;margin:10px 0;">
                             <div style="font-size:20px;font-weight:bold;margin-bottom:15px;display:flex;align-items:center;justify-content:center;">
                               <span style="font-size:1.3em;margin-right:10px;">${genreIcon}</span>
                               ${circle.name}
                             </div>
                             
                             <div style="padding:12px;background-color:white;border-radius:8px;margin-bottom:15px;">
                               <div style="margin-bottom:8px;">
                                 <span style="font-weight:bold;min-width:80px;display:inline-block;">テーマ:</span>
                                 <span>${circle.theme}</span>
                               </div>
                               <div style="margin-bottom:8px;">
                                 <span style="font-weight:bold;min-width:80px;display:inline-block;">ジャンル:</span>
                                 <span>${circle.genre}</span>
                               </div>
                               <div>
                                 <span style="font-weight:bold;min-width:80px;display:inline-block;">対象:</span>
                                 <span>${circle.gender}</span>
                               </div>
                             </div>`;

            if (circle.details) {
                detailsStr += `<div style="padding:12px;background-color:#f0f4ff;border-radius:8px;margin-bottom:15px;">
                              <div style="font-weight:bold;margin-bottom:5px;">サークル詳細:</div>
                              <div>${circle.details}</div>
                            </div>`;
            }

            // メンバー一覧
            detailsStr += `<div style="padding:12px;background-color:#f5f5f5;border-radius:8px;">
                          <div style="font-weight:bold;margin-bottom:8px;">メンバー一覧 (${members.length}人):</div>
                          <div style="display:flex;flex-wrap:wrap;gap:8px;">`;

            for (const member of members) {
                detailsStr += `<span style="background-color:white;padding:5px 10px;border-radius:15px;font-size:14px;">
                              👤 ${member.display_name}
                            </span>`;
            }

            detailsStr += `</div></div></div>`;

            post_keicho(detailsStr, SPEAKER.AGENT, person);

            // サークルにまだ参加していない場合は参加するかどうか聞く
            if (!circle.is_member && !circle.creator_id) {
                let validSelection = false;

                while (!validSelection) {
                    const answer = await miku_ask("このサークルに参加しますか？（はい/いいえ）");

                    if (/はい|参加|する/.test(answer)) {
                        validSelection = true;

                        // サークルに参加
                        const joinResponse = await fetch(`https://es4.eedept.kobe-u.ac.jp/online-circle/api/circles/${circleId}/join`, {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${token}`
                            }
                        });

                        if (joinResponse.ok) {
                            await miku_say(`「${circle.name}」サークルへの参加が完了しました！`, "greeting");
                        } else {
                            const errorData = await joinResponse.json();
                            await miku_say(`サークル参加に失敗しました: ${errorData.message}`, "idle_think");
                        }
                    }
                    else if (/いいえ|参加しない|やめる/.test(answer)) {
                        validSelection = true;
                        await miku_say("わかりました。参加しなくても詳細は引き続き確認できます。", "greeting");
                    }
                    else {
                        await miku_say("「はい」か「いいえ」でお答えください。", "idle_think");
                    }
                }
            }
        } else {
            await miku_say("サークル詳細の取得に失敗しました。", "idle_think");
        }
    } catch (error) {
        console.error('サークル詳細表示中にエラーが発生しました:', error);
        await miku_say("サークル詳細の表示中にエラーが発生しました。", "idle_think");
    }
}

// 寄合作成の処理 - 対話内で行うよう修正
// 寄合作成機能が現在利用できないことを簡潔に伝える
async function handleCreateGathering() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('https://es4.eedept.kobe-u.ac.jp/online-circle/api/user-circles', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            // サークル情報の表示
            const data = await response.json();
            
            // 利用できないことを伝える
            
            // 代替方法を提案
            await miku_say("こちらのボタンを押すと寄合を作成できます！", "greeting");
            
            // ブラウザでの寄合作成ページへのリンク
            const alternativeMessage = `<div style="text-align:center;margin:15px;">
                <a href="https://es4.eedept.kobe-u.ac.jp/online-circle/create-gathering" 
                   target="_blank" 
                   style="display:inline-block;background-color:#4a90e2;color:white;padding:12px 20px;
                          border-radius:5px;text-decoration:none;font-weight:bold;">
                    ブラウザで寄合を作成する
                </a>
            </div>`;
            
            post_keicho(alternativeMessage, SPEAKER.AGENT, person);
            
            return;
        } else {
            await miku_say("サークル情報の取得に失敗しました。", "idle_think");
        }
    } catch (error) {
        console.error('寄合作成処理エラー:', error);
        await miku_say("処理中にエラーが発生しました。", "idle_think");
    }
}

// サークル作成処理
async function handleCreateCircle() {
    await miku_say("新しいサークルを作成します。", "greeting");

    // サークル名の入力
    const name = await miku_ask("サークル名を教えてください");
    if (!name || name.length < 2) {
        await miku_say("サークル名が短すぎます。", "idle_think");
        return;
    }

    // テーマの入力
    const theme = await miku_ask("サークルのテーマを教えてください");
    if (!theme || theme.length < 2) {
        await miku_say("テーマが短すぎます。", "idle_think");
        return;
    }

    // ジャンルの入力
    await miku_say("ジャンルを選んでください：\n1. スポーツ\n2. 音楽\n3. 芸術\n4. 学習\n5. その他", "guide_normal");
    const genreAnswer = await miku_ask("番号でお答えください (1-5)");

    let genre;
    if (/1|スポーツ/.test(genreAnswer)) {
        genre = "スポーツ";
    } else if (/2|音楽/.test(genreAnswer)) {
        genre = "音楽";
    } else if (/3|芸術/.test(genreAnswer)) {
        genre = "芸術";
    } else if (/4|学習/.test(genreAnswer)) {
        genre = "学習";
    } else {
        genre = "その他";
    }

    // 対象性別の入力
    await miku_say("対象を選んでください：\n1. 男性のみ\n2. 女性のみ\n3. どなたでも", "guide_normal");
    const genderAnswer = await miku_ask("番号でお答えください (1-3)");

    let gender;
    if (/1|男性/.test(genderAnswer)) {
        gender = "男性のみ";
    } else if (/2|女性/.test(genderAnswer)) {
        gender = "女性のみ";
    } else {
        gender = "両方";
    }

    // 詳細の入力
    const details = await miku_ask("サークルの詳細を教えてください（任意）");

    // 確認
    const confirmStr = `<div style="background-color:#e3f2fd;padding:15px;border-radius:10px;margin:10px 0;">
                       <div style="font-size:18px;font-weight:bold;margin-bottom:10px;">📝 サークル内容の確認</div>
                       <div style="padding:10px;background-color:white;border-radius:8px;">
                         <div style="margin-bottom:5px;">
                           <span style="font-weight:bold;">サークル名:</span> ${name}
                         </div>
                         <div style="margin-bottom:5px;">
                           <span style="font-weight:bold;">テーマ:</span> ${theme}
                         </div>
                         <div style="margin-bottom:5px;">
                           <span style="font-weight:bold;">ジャンル:</span> ${genre}
                         </div>
                         <div style="margin-bottom:5px;">
                           <span style="font-weight:bold;">対象:</span> ${gender}
                         </div>
                         ${details ? `<div><span style="font-weight:bold;">詳細:</span> ${details}</div>` : ''}
                       </div>
                     </div>`;

    post_keicho(confirmStr, SPEAKER.AGENT, person);

    const confirmAnswer = await miku_ask("この内容でサークルを作成してよろしいですか？（はい/いいえ）");

    if (/はい|よい|良い|OK|作成|する/.test(confirmAnswer)) {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('https://es4.eedept.kobe-u.ac.jp/online-circle/api/circles', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ name, theme, genre, gender, details })
            });

            if (response.ok) {
                await miku_say(`「${name}」サークルを作成しました！`, "greeting");
            } else {
                const errorData = await response.json();
                await miku_say(`サークル作成に失敗しました: ${errorData.message}`, "idle_think");
            }
        } catch (error) {
            console.error('サークル作成処理中にエラーが発生しました:', error);
            await miku_say("サークル作成処理中にエラーが発生しました。", "idle_think");
        }
    } else {
        await miku_say("サークル作成をキャンセルしました。", "greeting");
    }
}

// 寄合確認の処理 - 対話内で行うよう修正
// 寄合確認の処理 - 対話内で行うよう修正
async function handleCheckGatherings() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('https://es4.eedept.kobe-u.ac.jp/online-circle/api/gatherings', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const data = await response.json();

            // 未来の寄合のみをフィルタリング
            const now = new Date();
            const participatingGatherings = data.participatingGatherings.filter(g =>
                new Date(g.datetime) > now
            );

            const invitedGatherings = data.invitedGatherings.filter(g =>
                new Date(g.datetime) > now
            );

            // 参加予定の寄合一覧を表示
            if (participatingGatherings.length > 0) {
                let gatheringsStr = `<div style="background-color:#e8f5e9;padding:15px;border-radius:10px;margin:10px 0;">
                                   <div style="font-size:18px;font-weight:bold;margin-bottom:10px;">
                                   📅 参加予定の寄合 (${participatingGatherings.length}件)</div>`;

                for (let i = 0; i < participatingGatherings.length; i++) {
                    const gathering = participatingGatherings[i];
                    const gatheringTime = new Date(gathering.datetime);

                    gatheringsStr += `<div style="padding:10px;background-color:white;border-radius:8px;margin-bottom:10px;">
                                    <div style="font-size:16px;font-weight:bold;margin-bottom:5px;">
                                      ${i + 1}. ${gathering.theme}
                                    </div>
                                    <div style="display:flex;justify-content:space-between;margin-bottom:5px;">
                                      <span style="color:#666;">${gathering.circle_name}</span>
                                      <span style="font-weight:bold;">${gatheringTime.toLocaleString('ja-JP')}</span>
                                    </div>
                                  </div>`;
                }

                gatheringsStr += `</div>`;
                post_keicho(gatheringsStr, SPEAKER.AGENT, person);
            } else {
                await miku_say("参加予定の寄合はありません。", "greeting");
            }

            // 招待中の寄合一覧を表示
            if (invitedGatherings.length > 0) {
                let invitationsStr = `<div style="background-color:#fff3e0;padding:15px;border-radius:10px;margin:10px 0;">
                                    <div style="font-size:18px;font-weight:bold;margin-bottom:10px;">
                                    📩 招待中の寄合 (${invitedGatherings.length}件)</div>`;

                for (let i = 0; i < invitedGatherings.length; i++) {
                    const gathering = invitedGatherings[i];
                    const gatheringTime = new Date(gathering.datetime);
                    const startIdx = participatingGatherings.length + i + 1;

                    invitationsStr += `<div style="padding:10px;background-color:white;border-radius:8px;margin-bottom:10px;">
                                     <div style="font-size:16px;font-weight:bold;margin-bottom:5px;">
                                       ${startIdx}. ${gathering.theme}
                                     </div>
                                     <div style="display:flex;justify-content:space-between;margin-bottom:5px;">
                                       <span style="color:#666;">${gathering.circle_name}</span>
                                       <span style="font-weight:bold;">${gatheringTime.toLocaleString('ja-JP')}</span>
                                     </div>
                                   </div>`;
                }

                invitationsStr += `</div>`;
                post_keicho(invitationsStr, SPEAKER.AGENT, person);
            }

            if (participatingGatherings.length === 0 && invitedGatherings.length === 0) {
                await miku_say("現在、参加予定の寄合も招待もありません。", "greeting");
                return;
            }

            // 寄合の合計数
            const totalGatherings = participatingGatherings.length + invitedGatherings.length;

            // 詳細表示
            let validSelection = false;

            while (!validSelection) {
                const answer = await miku_ask("詳細を確認したい寄合の番号を教えてください。または「やめる」で終了できます。");

                if (/やめる|終了|中止|キャンセル/.test(answer)) {
                    await miku_say("寄合確認を終了します。", "greeting");
                    return;
                }

                const num = parseInt(answer.match(/\d+/) || ["0"][0]);

                if (num >= 1 && num <= totalGatherings) {
                    validSelection = true;

                    if (num <= participatingGatherings.length) {
                        // 参加予定の寄合
                        const selectedGathering = participatingGatherings[num - 1];
                        await displayGatheringInfo(selectedGathering.id);
                    } else {
                        // 招待中の寄合
                        const index = num - participatingGatherings.length - 1;
                        const selectedGathering = invitedGatherings[index];
                        await displayGatheringInfo(selectedGathering.id);

                        // 招待に対する応答
                        let validResponse = false;

                        while (!validResponse) {
                            const responseAnswer = await miku_ask("この招待に返信しますか？ 「参加する」「参加しない」「後で決める」からお選びください。");

                            if (/参加する/.test(responseAnswer)) {
                                validResponse = true;
                                await respondToInvitation(selectedGathering.id, 'accepted');
                            }
                            else if (/参加しない/.test(responseAnswer)) {
                                validResponse = true;
                                await respondToInvitation(selectedGathering.id, 'declined');
                            }
                            else if (/後で|やめる|キャンセル/.test(responseAnswer)) {
                                validResponse = true;
                                await miku_say("後で返信することにしました。", "greeting");
                            }
                            else {
                                await miku_say("「参加する」「参加しない」「後で決める」のいずれかでお答えください。", "idle_think");
                            }
                        }
                    }
                } else {
                    await miku_say(`有効な番号を選んでください（1から${totalGatherings}の間）。もう一度お試しください。`, "idle_think");
                }
            }
        } else {
            await miku_say("寄合情報の取得に失敗しました。", "idle_think");
        }
    } catch (error) {
        console.error('寄合確認処理中にエラーが発生しました:', error);
        await miku_say("寄合確認処理中にエラーが発生しました。", "idle_think");
    }
}

// 招待に応答する
async function respondToInvitation(gatheringId, status) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`https://es4.eedept.kobe-u.ac.jp/online-circle/api/gatherings/${gatheringId}/participate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ status })
        });

        if (response.ok) {
            if (status === 'accepted') {
                await miku_say("参加登録が完了しました！", "greeting");
            } else {
                await miku_say("不参加の登録が完了しました。", "greeting");
            }
        } else {
            await miku_say("応答の登録に失敗しました。後でもう一度お試しください。", "idle_think");
        }
    } catch (error) {
        console.error('招待応答中にエラーが発生しました:', error);
        await miku_say("応答処理中にエラーが発生しました。", "idle_think");
    }
}

// 定期的な通知チェックのための状態管理
let lastCheckedInvitations = new Date(0);
let lastCheckedGatherings = new Date(0);
let invitationNotificationShown = false;
let gatheringNotificationShown = false;

// 招待・寄合の定期チェック
async function checkCircleNotifications() {
    // 他のサービスが実行中・会話中は通知しない
    if (serviceFlag || talking) return;

    const now = new Date();

    // 招待チェック（最後のチェックから5分以上経過している場合のみ）
    if (now - lastCheckedInvitations > 5 * 60 * 1000) {
        lastCheckedInvitations = now;
        const hasUnreadInvitations = await checkUnreadInvitations();

        if (hasUnreadInvitations && !invitationNotificationShown) {
            invitationNotificationShown = true;
            // 未読の招待があることを通知するが、邪魔にならないように会話開始ボタンを表示
            const message = "<div style='background-color:#f0f4ff;padding:12px;border-radius:8px;border-left:4px solid #4a69ff;margin:10px 0;'>" +
                "<div style='font-weight:bold;display:flex;align-items:center;'>" +
                "<span style='font-size:1.5em;margin-right:8px;'>📩</span>" +
                "新しい寄合への招待があります" +
                "</div>" +
                "<div style='margin-top:8px;'>「サークル」と話しかけると確認できます</div>" +
                "</div>";
            post_text(message);
        }
    }

    // 寄合チェック（最後のチェックから1分以上経過している場合のみ）
    if (now - lastCheckedGatherings > 60 * 1000) {
        lastCheckedGatherings = now;
        const hasUpcomingGatherings = await checkUpcomingGatherings();

        if (hasUpcomingGatherings && !gatheringNotificationShown) {
            gatheringNotificationShown = true;
            // まもなく始まる寄合があることを通知する
            const message = "<div style='background-color:#fff4e5;padding:12px;border-radius:8px;border-left:4px solid #ff9800;margin:10px 0;'>" +
                "<div style='font-weight:bold;display:flex;align-items:center;'>" +
                "<span style='font-size:1.5em;margin-right:8px;'>⏰</span>" +
                "まもなく寄合が始まります！" +
                "</div>" +
                "<div style='margin-top:8px;'>「サークル」と話しかけると参加できます</div>" +
                "</div>";
            post_text(message);
        }
    }
}

// サービスに登録
apps.push(circleService);

// 定期チェックを設定
setInterval(checkCircleNotifications, 2 * 60 * 1000); // 2分ごとにチェック

// 初回チェック実行
setTimeout(checkCircleNotifications, 10000); // ページロード10秒