import hydra
from modules.capture import Frame_capture
from modules.rendering import Rendering


@hydra.main(version_base=None, config_path='configs', config_name='config')
def main(config):
    capture = Frame_capture(config['capture'])
    rendering = Rendering(config)

    for frame in capture.process():
        rendering.process(frame)

    capture.release()

if __name__ == '__main__':
    main()