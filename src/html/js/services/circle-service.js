/**
 * circle-service.js
 * PCメイちゃんとオンラインサークルを連携するためのスクリプト
 */

// オンラインサークルサービスの定義
const circleService = {
    name: "オンラインサークル",
    keyword: "サークル",
    description: "オンラインでサークル活動や寄合を楽しめるサービス",
    func: async function() { await handleCircleService(); },
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
                return diffMinutes <= 30 && diffMinutes >= 0;
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
                            ${i+1}. ${inv.theme}（${dateStr}）- ${inv.circle_name}</div>`;
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
                    const answer = await miku_ask("参加しますか？（はい/いいえ）");
                    
                    if (/はい|参加|する/.test(answer)) {
                        // ブラウザで寄合ページを開く
                        const url = `https://es4.eedept.kobe-u.ac.jp/online-circle/gathering/${upcoming[0].id}`;
                        window.open(url, '_blank');
                        await miku_say("参加リンクを開きました。良い時間をお過ごしください！", "greeting");
                    }
                } else {
                    await miku_say("まもなく複数の寄合が始まります。参加しますか？", "greeting");
                    const answer = await miku_ask("参加する場合は寄合の番号を教えてください。（1, 2, ... または「やめる」）");
                    
                    if (/やめる|中止|キャンセル|いいえ|no/.test(answer)) {
                        await miku_say("わかりました。また後でご案内します。", "greeting");
                    } else {
                        // 番号を解析
                        const num = parseInt(answer.match(/\d+/) || ["0"][0]);
                        if (num >= 1 && num <= upcoming.length) {
                            const url = `https://es4.eedept.kobe-u.ac.jp/online-circle/gathering/${upcoming[num-1].id}`;
                            window.open(url, '_blank');
                            await miku_say("参加リンクを開きました。良い時間をお過ごしください！", "greeting");
                        } else {
                            await miku_say("有効な番号が選択されませんでした。また後でご案内します。", "greeting");
                        }
                    }
                }
            }
        }
    } catch (error) {
        console.error('寄合通知中にエラーが発生しました:', error);
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

// サークル参加の処理
async function handleJoinCircle() {
    await miku_say("サークルへの参加ページを開きます。ブラウザで開いたページからサークルに参加してください。", "smile");
    window.open("https://es4.eedept.kobe-u.ac.jp/online-circle/join-circle", '_blank');
    stop_keicho();
}

// サークル確認の処理
async function handleCheckCircles() {
    await miku_say("参加中のサークル一覧ページを開きます。", "smile");
    window.open("https://es4.eedept.kobe-u.ac.jp/online-circle/check-circles", '_blank');
    stop_keicho();
}

// 寄合作成の処理
async function handleCreateGathering() {
    await miku_say("寄合作成ページを開きます。ブラウザで開いたページから寄合を作成できます。", "smile");
    window.open("https://es4.eedept.kobe-u.ac.jp/online-circle/create-gathering", '_blank');
    stop_keicho();
}

// 寄合確認の処理
async function handleCheckGatherings() {
    await miku_say("寄合一覧ページを開きます。参加予定の寄合を確認できます。", "smile");
    window.open("https://es4.eedept.kobe-u.ac.jp/online-circle/gathering-list", '_blank');
    stop_keicho();
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
setTimeout(checkCircleNotifications, 10000); // ページロード10秒後に最初のチェック