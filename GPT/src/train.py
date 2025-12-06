from ultralytics import YOLO

model = YOLO("yolov8n.pt")

model.train(
    data="config/data.yaml",
    epochs=50,
    imgsz=640,
    batch=16,
    name="unsafe_act_model"
)
