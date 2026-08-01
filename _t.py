
import socket, time
s = socket.socket()
s.settimeout(3)
s.connect(("127.0.0.1", 8000))
req = "POST /api/auth/send-code HTTP/1.1\r\nHost: 127.0.0.1:8000\r\nContent-Type: application/json\r\nContent-Length: 42\r\n\r\n" + '{"email":"sock@test.com","type":"register"}'
s.sendall(req.encode())
time.sleep(1)
try:
    d = s.recv(4096)
    if d:
        print(d.decode())
    else:
        print("No response")
except socket.timeout:
    print("Timeout")
s.close()
