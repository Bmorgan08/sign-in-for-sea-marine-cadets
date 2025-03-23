Start-Process "https://bmorgan08.github.io/sign-in-for-sea-marine-cadets/"
Start-Process "cmd.exe" -ArgumentList '/k', 'cd /d "E:\Code\Sign-in system\sign-in-for-sea-marine-cadets\backend" && node websocket.js'
