// auto-meeting-service.js

class AutoMeetingService {
    constructor() {
      this.meetings = [];
    }
  
    async scheduleMeeting(dateTime, participants) {
        try {
          const meetingId = this.generateMeetingId();
          const userId = this.getUserId();
          const meeting = {
            id: meetingId,
            dateTime: dateTime,
            participants: participants,
            organizer: userId
          };
          
          // MeetCS27サービスとの連携
          const meetingUrl = await this.createMeetCS27Meeting(meeting);
          
          // カレンダーサービスとの連携
          await this.addToCalendar(meeting, meetingUrl);
          
          this.meetings.push(meeting);
          return meeting;
        } catch (error) {
          console.error("Error scheduling meeting:", error);
          throw error;
        }
      }
  
    generateMeetingId() {
      return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    }
  
    getUserId() {
      return chatId; // Assuming 'chatId' is globally available from videochat.js
    }
  
    async createMeetCS27Meeting(meeting) {
      const params = {
        'uid': meeting.organizer,
        'pidnicknames': meeting.participants,
        'starttime': moment(meeting.dateTime).format('YYYY-MM-DDTHH:mm:00+09:00')
      };
      
      const result = await inputMeeting(params); // From videochat.js
      return `https://wsapp.cs.kobe-u.ac.jp/meetcs27/${result.zoomid}?user=${meeting.organizer}`;
    }
  
    async addToCalendar(meeting, meetingUrl) {
      const params = {
        'start': { 'dateTime': moment(meeting.dateTime).format('YYYY-MM-DDTHH:mm:00+09:00') },
        'end': { 'dateTime': moment(meeting.dateTime).add(1, 'hour').format('YYYY-MM-DDTHH:mm:00+09:00') },
        'summary': `Meeting: ${meeting.participants.join(', ')}`,
        'description': `${uid}\n\nMeeting URL: ${meetingUrl}`,
      };
      
      await createEvent(params); // From calendar.js
    }
  
    async notifyParticipants(meeting) {
      // TODO: Implement notification logic
      console.log(`Notifying participants for meeting: ${meeting.id}`);
    }
  }
  
// グローバルスコープにインスタンスを作成
window.autoMeetingService = new AutoMeetingService();

// グローバル関数としてscheduleMeetingを定義
window.scheduleMeeting = async function() {
  const dateTimeInput = document.getElementById('meeting-datetime');
  const participantsInput = document.getElementById('meeting-participants');
  
  const dateTime = dateTimeInput.value;
  const participants = participantsInput.value.split(',').map(p => p.trim());

  if (!dateTime || participants.length === 0) {
    alert('日時と参加者を入力してください。');
    return;
  }

  try {
    const meeting = await autoMeetingService.scheduleMeeting(dateTime, participants);
    alert(`ミーティングが正常にスケジュールされました。ミーティングID: ${meeting.id}`);
    dateTimeInput.value = '';
    participantsInput.value = '';
  } catch (error) {
    alert(`ミーティングのスケジュールに失敗しました: ${error.message}`);
  }
};