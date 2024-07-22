// グローバル変数の確認
if (typeof uid === 'undefined') {
    console.error('uid is not defined. Make sure it is set in the global scope.');
}

async function videochat() {
    try {
        videochatFlag = true;
        await miku_say("ビデオ会議サービスを開始します。何をしますか？", "smile");
        
        await miku_say("1. 会議を作成する\n2. 会議の通知を確認する\n3. 会議に参加する", "self_introduction");
        let answer = await manualInput("選択肢の番号を入力してください（1, 2, または 3）");
        
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
        await miku_say("会議の作成を開始します。以下の情報を入力してください。", "self_introduction");
        
        let meetingName = await miku_ask("会議の名前を教えてください。", false, "self_introduction");
        
        await miku_say("会議の日付を入力してください。", "self_introduction");
        let meetingDate = await manualInput("日付（例：2023-07-01）");
        
        await miku_say("会議の時間を入力してください。", "self_introduction");
        let meetingTime = await manualInput("時間（例：14:30）");
        
        await miku_say("参加者の名前をカンマ区切りで入力してください。", "self_introduction");
        let participants = await manualInput("参加者名（例：山田太郎,佐藤花子）");

        if (!validateMeetingInput(meetingName, meetingDate, meetingTime, participants)) {
            throw new Error('Invalid input');
        }

        let participantNames = participants.split(',').map(p => p.trim());
        let participantUids = await Promise.all(participantNames.map(getUidFromName));
        
        let meetingId = await generateSecureMeetingId();
        let meetingUrl = await generateMeetingUrl(meetingId, uid);

        let meetingData = {
            id: meetingId,
            name: meetingName,
            date: meetingDate,
            time: meetingTime,
            participants: participantUids,
            participantNames: participantNames,
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

// 手動入力を処理する関数
function manualInput(prompt) {
    return new Promise((resolve) => {
        let inputElement = document.createElement('input');
        inputElement.type = 'text';
        inputElement.placeholder = prompt;
        
        let submitButton = document.createElement('button');
        submitButton.textContent = '送信';
        
        let container = document.getElementById('status');
        container.appendChild(inputElement);
        container.appendChild(submitButton);
        
        submitButton.onclick = () => {
            let value = inputElement.value;
            container.removeChild(inputElement);
            container.removeChild(submitButton);
            resolve(value);
        };
    });
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



async function joinMeeting() {
    try {
        const upcomingMeetings = await getUpcomingMeetings(uid);
        if (upcomingMeetings.length === 0) {
            await miku_say("参加可能な会議はありません。", "idle_think");
            return;
        }

        let meetingList = upcomingMeetings.map((m, i) => `${i + 1}. ${m.name} (${m.date} ${m.time})`).join('\n');
        let answer = await miku_ask(`参加する会議の番号を選んでください：\n${meetingList}`, false, "self_introduction");

        let selectedIndex = parseInt(answer) - 1;
        if (isNaN(selectedIndex) || selectedIndex < 0 || selectedIndex >= upcomingMeetings.length) {
            await miku_say("無効な選択です。", "idle_think");
            return;
        }

        let selectedMeeting = upcomingMeetings[selectedIndex];
        await miku_say(`${selectedMeeting.name}に参加します。ブラウザで会議URLを開きます。`, "smile");
        window.open(selectedMeeting.url, '_blank');
    } catch (error) {
        console.error('Error in joinMeeting:', error);
        await miku_say("会議への参加中にエラーが発生しました。", "idle_think");
    }
}

async function autoStartMeeting() {
    try {
        const now = new Date();
        const upcomingMeetings = await getUpcomingMeetings(uid);
        const meetingsToStart = upcomingMeetings.filter(meeting => {
            const meetingDateTime = new Date(`${meeting.date}T${meeting.time}`);
            const timeDiff = meetingDateTime.getTime() - now.getTime();
            return timeDiff >= 0 && timeDiff <= 5 * 60 * 1000; // 5分以内に開始する会議
        });

        for (let meeting of meetingsToStart) {
            await miku_say(`${meeting.name}が間もなく始まります。参加しますか？`, "self_introduction");
            let answer = await miku_ask("はい/いいえ", false, "idle_think");
            if (answer.toLowerCase() === 'はい') {
                await miku_say(`${meeting.name}に参加します。ブラウザで会議URLを開きます。`, "smile");
                window.open(meeting.url, '_blank');
            }
        }
    } catch (error) {
        console.error('Error in autoStartMeeting:', error);
    }
}

// 会議データを取得する関数（ローカルストレージ版）
async function getMeetingById(meetingId) {
    try {
        let meetings = JSON.parse(localStorage.getItem('meetings')) || [];
        return meetings.find(m => m.id === meetingId);
    } catch (error) {
        console.error('Error getting meeting by id:', error);
        throw error;
    }
}

const API_BASE_URL = 'https://es4.eedept.kobe-u.ac.jp/videochat_server';

async function saveMeetingData(meetingData) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/meetings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(meetingData),
      });
      if (!response.ok) {
        throw new Error('Failed to save meeting data');
      }
      return response.json();
    } catch (error) {
      console.error('Error saving meeting data:', error);
      throw error;
    }
  }
  
  async function sendNotifications(meetingData) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/notifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          meetingName: meetingData.name,
          participants: meetingData.participants,
        }),
      });
      if (!response.ok) {
        throw new Error('Failed to send notifications');
      }
      return response.json();
    } catch (error) {
      console.error('Error sending notifications:', error);
      throw error;
    }
  }
  
  async function getNotifications(userId) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/notifications/${userId}`);
      if (!response.ok) {
        throw new Error('Failed to get notifications');
      }
      return response.json();
    } catch (error) {
      console.error('Error getting notifications:', error);
      throw error;
    }
  }
  
  async function getUpcomingMeetings(userId) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/meetings/${userId}`);
      if (!response.ok) {
        throw new Error('Failed to get upcoming meetings');
      }
      return response.json();
    } catch (error) {
      console.error('Error getting upcoming meetings:', error);
      throw error;
    }
  }
  
  // 新しい関数: 通知を確認する
  async function checkNotifications() {
    try {
      const notifications = await getNotifications(uid);
      if (notifications.length === 0) {
        await miku_say("新しい通知はありません。", "smile");
      } else {
        for (let notification of notifications) {
          await miku_say(notification.message, "self_introduction");
        }
      }
    } catch (error) {
      console.error('Error checking notifications:', error);
      await miku_say("通知の確認中にエラーが発生しました。", "idle_think");
    }
  }