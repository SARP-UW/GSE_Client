import os
import json
import logging
from bitarray import bitarray

ROOT_FOLDER = '/IGS'

def get_root_path():
    path = os.getcwd()

    return path + ROOT_FOLDER


def get_config_path():
    return get_root_path() + '/gse_master.json'


def load_config(config_path=get_config_path()):
    """
    Load configuration from a JSON file.
    """
    try:
        with open(config_path, 'r') as f:
            return json.load(f)
    except Exception as e:
        logging.error(f"Error loading config file: {e}")
        return None
    

def bitfield(n):
	"""
	Convert input integer into bit array. All integers sent are with leading to allow for zero
	padding.
	"""
	b = [1 if digit=='1' else 0 for digit in bin(n)[2:]]
	# remove leading one used to preserve leading 0's
	del b[0]
	# pad right side of list with zeroes
	if len(b) < 10:
		b += [0] * (10 - len(b))
	return b


def num(b):
	"""
	Convert bitfield array to integer.
	"""
	assert(len(b) == 10), "Invalid state array length."
	c = b.copy()
	# insert a leading one to preserve leading zeros (THIS MUST BE REMOVED BY bitfield())
	c.insert(0, 1)
	return int(bitarray(c).to01(), 2)