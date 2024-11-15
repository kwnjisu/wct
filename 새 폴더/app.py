# app.py
from flask import Flask, render_template
from flask_socketio import SocketIO, emit
import eventlet

eventlet.monkey_patch()

app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret!'
socketio = SocketIO(app)

# 연결된 클라이언트를 관리하기 위한 리스트
clients = []

@app.route('/')
def index():
    return render_template('index.html')

@socketio.on('connect')
def handle_connect():
    print('새로운 클라이언트가 연결되었습니다.')
    clients.append(request.sid)
    emit('user_connected', {'sid': request.sid}, broadcast=True)

@socketio.on('disconnect')
def handle_disconnect():
    print('클라이언트가 연결을 끊었습니다.')
    clients.remove(request.sid)
    emit('user_disconnected', {'sid': request.sid}, broadcast=True)

@socketio.on('signal')
def handle_signal(data):
    # 신호 데이터를 다른 클라이언트로 전달
    emit('signal', data, broadcast=True, include_self=False)

@socketio.on('joint_data')
def handle_joint_data(data):
    # 관절 데이터를 다른 클라이언트로 전달
    emit('joint_data', data, broadcast=True, include_self=False)

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000)
