from modules.capture import Frame_capture
from modules.rendering import Rendering

class Object_container:
    def __init__(self, config):
        self.capture = Frame_capture(config['capture'])
        self.rendering  = Rendering(config['rendering'])

    def process_run(self):
        try:
            for obj_frame in self.capture.process():
                _, buffer = self.rendering.process(obj_frame)

                # Формируем кусок потока в формате MJPEG
                yield (b'--frame\r\n'b'Content-Type: image/jpeg\r\n\r\n' + buffer.tobytes() + b'\r\n')
        finally:
            self.capture.release()