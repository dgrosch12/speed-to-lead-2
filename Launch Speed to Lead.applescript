on run
	tell application "Terminal"
		activate
		set currentTab to do script "cd '/Users/dgrosch/Speed to lead 2.0/speed-to-lead-frontend' && npm run dev"
	end tell
	
	-- Wait a few seconds for the server to start, then open browser
	delay 3
	tell application "Google Chrome"
		activate
		make new window
		set URL of active tab of front window to "http://localhost:3000"
	end tell
end run
