# -*- coding: utf-8 -*-
# python2 and python3
from __future__ import print_function
from flask import Flask, request, send_file
import json
import numpy as np
import PIL
import tensorflow as tf
import datetime
import requests
from tensorflow.keras.preprocessing.image import img_to_array, load_img
from skimage.color import rgb2lab, lab2rgb
import argparse
import os

app = Flask(__name__)

def tensor_to_image(tensor):
    tensor = tensor*255
    tensor = np.array(tensor, dtype=np.uint8)
    if np.ndim(tensor)>3:
        assert tensor.shape[0] == 1
        tensor = tensor[0]
    return PIL.Image.fromarray(tensor)

@app.route('/predict', methods=['POST'])
def predict():
    content_image = request.files['content_image']
    content_image.save('./content_image.jpg')

    image = img_to_array(load_img('./content_image.jpg'))
    image = np.array(image, dtype=float)

    X = rgb2lab(1.0/255*image)[:,:,0]
    Y = rgb2lab(1.0/255*image)[:,:,1:]
    Y /= 128
    X = X.reshape(1, 400, 400, 1)
    print(X.shape)
    X = np.squeeze(X, axis=(0,))

    data = {
        'instances': [
            {
                "input_1": X.tolist(),
            }
        ]
    }

    parser = argparse.ArgumentParser()
    parser.add_argument('--url', type=str, default = os.environ.get('URL'))
    args = parser.parse_args()
    url = args.url
    r = requests.post(url, data=json.dumps(data))

    res = r.json()['predictions']
    res = tf.constant(res, tf.float32)
    output = res * 128
    # Output colorizations
    cur = np.zeros((400, 400, 3))
    cur[:,:,0] = X[:,:,0]
    cur[:,:,1:] = output[0]
    res = lab2rgb(cur)

    path = "./result-" + datetime.datetime.now().strftime("%Y%m%d%H%M%S") + ".png"
    tensor_to_image(res).save(path)
    return send_file(path, mimetype='image/png')

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=3333, debug=True)
