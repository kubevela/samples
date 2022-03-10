# -*- coding: utf-8 -*-
# python2 and python3
from __future__ import print_function
from flask import Flask, request, send_file
import json
import os
import matplotlib as mpl
import numpy as np
import os
import PIL
import tensorflow as tf
import datetime
import requests
from tensorflow.keras.preprocessing.image import img_to_array, load_img
from skimage.color import rgb2lab, lab2rgb
import argparse



app = Flask(__name__)

def tensor_to_image(tensor):
    tensor = tensor*255
    tensor = np.array(tensor, dtype=np.uint8)
    if np.ndim(tensor)>3:
        assert tensor.shape[0] == 1
        tensor = tensor[0]
    return PIL.Image.fromarray(tensor)

def my_load_img(img):
    max_dim = 512
    # img = tf.io.read_file(path_to_img)
    img = tf.image.decode_image(img, channels=3)
    img = tf.image.convert_image_dtype(img, tf.float32)

    shape = tf.cast(tf.shape(img)[:-1], tf.float32)
    long_dim = max(shape)
    scale = max_dim / long_dim

    new_shape = tf.cast(shape * scale, tf.int32)

    img = tf.image.resize(img, new_shape)
    # img = img[tf.newaxis, :]
    return img

def color(content_image, url):
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
    return path

def style(content_image, style_image, url):
    mpl.rcParams['figure.figsize'] = (12,12)
    mpl.rcParams['axes.grid'] = False

    data = {
        'instances': [
            {
                "placeholder": tf.constant(content_image).numpy().tolist(),
                "placeholder_1": tf.constant(style_image).numpy().tolist(),
            }
        ]
    }
    r = requests.post(url, data=json.dumps(data), headers={'style': 'transfer'})
    res = r.json()['predictions'][0]
    res = tf.constant(res, tf.float32)

    path = "./result-" + datetime.datetime.now().strftime("%Y%m%d%H%M%S") + ".png"
    tensor_to_image(res).save(path)
    return path

@app.route('/predict', methods=['POST'])
def predict():
    parser = argparse.ArgumentParser()
    parser.add_argument('--url', type=str, default = os.environ.get('URL'))
    args = parser.parse_args()
    url = args.url

    if request.headers.get("style") != "transfer":
        path = color(request.files['content_image'], url)
    else:
        content_image = request.files['content_image']
        style_image = request.files['style_image']
        content_image = my_load_img(content_image.read())
        style_image = my_load_img(style_image.read())
        path = style(content_image, style_image, url)

    return send_file(path, mimetype='image/png')


if __name__ == "__main__":
    app.run(host='0.0.0.0', port=3333, debug=True)