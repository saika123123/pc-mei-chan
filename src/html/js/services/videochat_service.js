// グローバル変数の確認
if (typeof uid === 'undefined') {
    console.error('uid is not defined. Make sure it is set in the global scope.');
}

async function videochat() {
    try {
        videochatFlag = true;
        await miku_say("ビデオ会議サービスを開始します。何をしますか？", "smile");
        let answer = await miku_ask("1. 会議を作成する\n2. 会議の通知を確認する\n3. 会議に参加する", false, "self_introduction");
        
        switch(answer) {
            case "1":
                await createMeeting();
                break;
            case "2":
                await checkNotifications();
                break;
            case "3":
                await joinMeeting();
                break;
            default:
                await miku_say("有効な選択肢を選んでください。", "idle_think");
                break;
        }
    } catch (error) {
        console.error('Error in videochat:', error);
        await miku_say("申し訳ありません。エラーが発生しました。", "idle_think");
    } finally {
        videochatFlag = false;
    }
}

async function createMeeting() {
    try {
        let meetingName = await miku_ask("会議の名前を教えてください。", false, "self_introduction");
        let meetingDate = await miku_ask("会議の日付を教えてください（例：2023-07-01）。", false, "self_introduction");
        let meetingTime = await miku_ask("会議の時間を教えてください（例：14:30）。", false, "self_introduction");
        let participants = await miku_ask("参加者のuidをカンマ区切りで教えてください。", false, "self_introduction");

        // 入力のバリデーション
        if (!validateMeetingInput(meetingName, meetingDate, meetingTime, participants)) {
            throw new Error('Invalid input');
        }

        let participantList = participants.split(',').map(p => p.trim());
        
        let meetingId = await generateSecureMeetingId();
        let meetingUrl = await generateMeetingUrl(meetingId, uid);

        let meetingData = {
            id: meetingId,
            name: meetingName,
            date: meetingDate,
            time: meetingTime,
            participants: participantList,
            url: meetingUrl,
            creator: uid
        };

        await saveMeetingData(meetingData);
        await sendNotifications(meetingData);

        await miku_say(`会議「${meetingName}」を作成しました。参加者に通知を送信しました。`, "smile");
    } catch (error) {
        console.error('Error in createMeeting:', error);
        await miku_say("会議の作成中にエラーが発生しました。", "idle_think");
    }
}

// 入力のバリデーション関数
function validateMeetingInput(name, date, time, participants) {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    
    if (!name || name.trim() === '') return false;
    if (!dateRegex.test(date)) return false;
    if (!timeRegex.test(time)) return false;
    if (!participants || participants.trim() === '') return false;
    
    return true;
}

// セキュアな会議IDの生成
async function generateSecureMeetingId() {
    const array = new Uint32Array(2);
    window.crypto.getRandomValues(array);
    return Array.from(array, dec => ('0' + dec.toString(16)).substr(-2)).join('');
}

// 動的な会議URL生成
async function generateMeetingUrl(meetingId, userId) {
    // 実際のAPIエンドポイントに合わせて修正してください
    return `https://wsapp.cs.kobe-u.ac.jp/meetcs27/${meetingId}?user=${userId}`;
}

// async function saveMeetingData(meetingData) {
//     try {
//         const response = await fetch('https://api.example.com/meetings', {
//             method: 'POST',
//             headers: {
//                 'Content-Type': 'application/json',
//             },
//             body: JSON.stringify(meetingData),
//         });
//         if (!response.ok) {
//             throw new Error('Failed to save meeting data');
//         }
//         return await response.json();
//     } catch (error) {
//         console.error('Error saving meeting data:', error);
//         throw error;
//     }
// }

// async function sendNotifications(meetingData) {
//     try {
//         const response = await fetch('https://api.example.com/notifications', {
//             method: 'POST',
//             headers: {
//                 'Content-Type': 'application/json',
//             },
//             body: JSON.stringify({
//                 meetingId: meetingData.id,
//                 participants: meetingData.participants,
//             }),
//         });
//         if (!response.ok) {
//             throw new Error('Failed to send notifications');
//         }
//         return await response.json();
//     } catch (error) {
//         console.error('Error sending notifications:', error);
//         throw error;
//     }
// }

// async function getNotifications(userId) {
//     try {
//         const response = await fetch(`https://api.example.com/notifications/${userId}`);
//         if (!response.ok) {
//             throw new Error('Failed to get notifications');
//         }
//         return await response.json();
//     } catch (error) {
//         console.error('Error getting notifications:', error);
//         throw error;
//     }
// }

// async function getUpcomingMeetings(userId) {
//     try {
//         const response = await fetch(`https://api.example.com/meetings/upcoming/${userId}`);
//         if (!response.ok) {
//             throw new Error('Failed to get upcoming meetings');
//         }
//         return await response.json();
//     } catch (error) {
//         console.error('Error getting upcoming meetings:', error);
//         throw error;
//     }
// }

async function saveMeetingData(meetingData) {
    try {
        let meetings = JSON.parse(localStorage.getItem('meetings')) || [];
        meetings.push(meetingData);
        localStorage.setItem('meetings', JSON.stringify(meetings));
        return meetingData;
    } catch (error) {
        console.error('Error saving meeting data:', error);
        throw error;
    }
}

async function sendNotifications(meetingData) {
    try {
        let notifications = JSON.parse(localStorage.getItem('notifications')) || [];
        notifications.push({
            meetingId: meetingData.id,
            participants: meetingData.participants,
        });
        localStorage.setItem('notifications', JSON.stringify(notifications));
        return { success: true };
    } catch (error) {
        console.error('Error sending notifications:', error);
        throw error;
    }
}

async function getNotifications(userId) {
    try {
        let notifications = JSON.parse(localStorage.getItem('notifications')) || [];
        return notifications.filter(n => n.participants.includes(userId));
    } catch (error) {
        console.error('Error getting notifications:', error);
        throw error;
    }
}

async function getUpcomingMeetings(userId) {
    try {
        let meetings = JSON.parse(localStorage.getItem('meetings')) || [];
        return meetings.filter(m => m.participants.includes(userId));
    } catch (error) {
        console.error('Error getting upcoming meetings:', error);
        throw error;
    }
}