const AutoMeetingService = {
    scheduleMeeting: function(dateTime, participants) {
        return fetch('/schedule', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ dateTime, participants }),
        })
        .then(response => response.json())
        .then(data => {
            console.log('Meeting scheduled:', data);
            return data;
        })
        .catch(error => {
            console.error('Error scheduling meeting:', error);
        });
    }
};