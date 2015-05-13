chrome.browserAction.onClicked.addListener(function() {
	console.log("Background!", "onClick", chrome.runtime);

	chrome.browserAction.setPopup({
		popup: 'popup.html'
	});

	chrome.alarms.create('watchnext-alarm', {
		when: Date.now()
	});

	/*
	chrome.runtime.connect({

	});
	*/
});


chrome.alarms.onAlarm.addListener(function(){
	console.log("onAlarm");

	
});