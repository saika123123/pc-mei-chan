const AutoMeetingService = {
    scheduleMeeting: function(dateTime, participants) {
        return this.getParticipantUIDs(participants)
            .then(participantUIDs => {
                const meetingId = this.generateMeetingId();
                const meetingUrl = this.generateMeetingUrl(meetingId);
                
                return fetch('/schedule', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ dateTime, participantUIDs, meetingUrl }),
                });
            })
            .then(response => response.json())
            .then(data => {
                console.log('Meeting scheduled:', data);
                this.scheduleMeetingStart(data.meetingId, dateTime);
                return data;
            })
            .catch(error => {
                console.error('Error scheduling meeting:', error);
                throw error;
            });
    },

    getParticipantUIDs: function(participantNames) {
        return fetch('/get-uids', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ names: participantNames }),
        })
        .then(response => response.json())
        .then(data => data.uids)
        .catch(error => {
            console.error('Error getting UIDs:', error);
            throw error;
        });
    },

    generateMeetingId: function() {
        return Math.random().toString(36).substring(2, 15);
    },

    generateMeetingUrl: function(meetingId) {
        return `https://wsapp.cs.kobe-u.ac.jp/meetcs27/${meetingId}`;
    },

    scheduleMeetingStart: function(meetingId, dateTime) {
        const startTime = new Date(dateTime).getTime();
        const now = new Date().getTime();
        const timeUntilStart = startTime - now;

        if (timeUntilStart > 0) {
            setTimeout(() => {
                this.startMeeting(meetingId);
            }, timeUntilStart);
        } else {
            this.startMeeting(meetingId);
        }
    },

    startMeeting: function(meetingId) {
        console.log(`Starting meeting ${meetingId}`);
        // CURRENT_USER_UID をグローバル変数や関数呼び出しで取得する必要があります
        const currentUserUid = getCurrentUserUid(); // この関数は別途定義する必要があります
        window.open(`https://wsapp.cs.kobe-u.ac.jp/meetcs27/${meetingId}?user=${currentUserUid}`, '_blank');
    }
};