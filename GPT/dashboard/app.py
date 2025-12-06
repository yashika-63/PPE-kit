from flask import Flask, render_template
import pandas as pd

app = Flask(__name__)

@app.route("/")
def index():
    data = pd.read_csv("logs/unsafe_log.csv", names=["Time","Event","Confidence"])
    return render_template("index.html", tables=[data.to_html()])

if __name__ == "__main__":
    app.run(debug=True)
