import os, yaml, time, asyncio

import server

DEFAULT_PAGE = "lasers"
PATH = os.path.dirname(os.path.abspath(__file__)) + '/'
BASE_URL = 'file://' + PATH + 'pages/data/'

def firefox():
    print("Starting Selenium...")
    try:
        from selenium.webdriver import Firefox
    except:
        print("Display requires the `selenium` package, which is not present")
        os.exit(0)
    return Firefox()

def load_conf(yamlstream):
    with open(PATH + "defaults.yaml", 'r') as f:
        default_conf = yaml.safe_load(f)
    default_conf.update(yaml.safe_load(yamlstream))
    return default_conf

def find_pages():
    pages = {}
    yaml_files = os.listdir(PATH + "pages")
    for filename in yaml_files:
        if ".yaml" in filename:
            with open(PATH + "pages/" + filename, "r") as f:
                config = yaml.safe_load(f)
            if "name" in config.keys():
                pages[config['name']] = filename
            else:
                pages[filename[:-5]] = filename
    return pages



async def reload_daemon(ffx, time):
    print(f"relead_daemon started: {time}")
    while time > 0:
        try:
            await asyncio.sleep(time)
            ffx.refresh()
            print("did refresh...")
        except asyncio.CancelledError:
            pass

class TableRunner:
    def __init__(self):
        self.ffx = firefox()
        self.reloader = None
        self.conf = None
        self.pages = find_pages()

        self.ffx.fullscreen_window()
        time.sleep(1)
        self.load_page(DEFAULT_PAGE)
    
    def load_page(self, pageID):
        if self.reloader is not None:
            self.reloader.cancel()

        try:
            with open(PATH + 'pages/' + pageID + '.yaml', 'r') as f:
                self.conf = load_conf(f)
        except:
            print(f'ERROR: could not load page {pageID}')
            return None

        self.ffx.get(f'{BASE_URL}{self.conf["dir"]}/{self.conf["index"]}')
        self.reloader = asyncio.create_task(reload_daemon(self.ffx, self.conf['refresh']))
        return self.conf


if __name__ == "__main__":
    server.init()
