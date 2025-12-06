import face_recognition

def encode_face(image):
    encoding = face_recognition.face_encodings(image)
    return encoding[0] if encoding else None
