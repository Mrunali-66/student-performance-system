import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))          # backend/
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))  # project root (for ml/)

from flask import Flask
from flask_cors import CORS
from models.db import init_db
from routes.student_routes import student_bp

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})
app.register_blueprint(student_bp, url_prefix='/')

@app.route('/health', methods=['GET'])
def health():
    return {'status': 'ok', 'message': 'EduTrack API running'}, 200

if __name__ == '__main__':
    init_db()
    app.run(debug=True, port=5000, host='0.0.0.0')
