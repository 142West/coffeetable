import os, yaml, time, asyncio

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


def load_page(ffx, pageID):
    try:
        with open(PATH + 'pages/' + pageID + '.yaml', 'r') as f:
            conf = load_conf(f)
    except:
        print(f'ERROR: could not load page {pageID}')
        return None

    ffx.get(f'{BASE_URL}{conf["dir"]}/{conf["index"]}')
    return conf

async def reload_daemon(ffx, time):
    print(f"relead_daemon started: {time}")
    while time > 0:
        try:
            await asyncio.sleep(time)
            ffx.refresh()
            print("did refresh...")
        except asyncio.CancelledError:
            pass

async def getInput():
    return input

async def main():
    ffx = firefox()
    ffx.fullscreen_window()
    time.sleep(1)

    curr_conf = load_page(ffx, DEFAULT_PAGE)
    print(f"loaded page, {curr_conf}")
    reload_task = asyncio.create_task(reload_daemon(ffx, curr_conf['refresh']))
#    print(f"{current_conf['refresh']}")
    print(f"started daemon, {reload_task}")
    
    while True:
        print("tick")
        await asyncio.sleep(3);
        new_conf = None
        #new_conf = load_page(ffx, pageID)
        if new_conf is not None:
            reload_task.cancel()
            curr_conf = new_conf
            reload_task = asyncio.create_task(reload_daemon(ffx, curr_conf['refresh']))

    

if __name__ == "__main__":
    asyncio.run(main())
