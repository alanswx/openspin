const ViewController = require('../../components/view-controller.js');
const { debounce, getGameList, getSettingsPath, getWheelImagePath } = require('../../components/common/theme-utils.js');

const fs = require('fs');
const ini = require('ini');
const path = require('path');

let _didFirstRender = new WeakMap();
let _settings = new WeakMap();
let _wheelActiveTimeout = new WeakMap();

class WheelMenuViewController extends ViewController {
  constructor(view, system) {
    super(view);

    this.system = system;

    this.game = null;
    this.gameList = [];

    this.background = view.querySelector('theme-background');
    this.foreground = view.querySelector('theme-foreground');
    this.special = view.querySelector('theme-special');
    this.wheel = view.querySelector('wheel-menu');

    this.special.system = system;

    this.getSettings().then((settings) => {
      this.special.settings = [settings['Special Art A'], settings['Special Art B']];
    });

    let onChange = debounce((evt) => {
      this.game = this.gameList[evt.detail.selectedIndex].name;

      this.view.addEventListener('transitionend', onHideThemeTransitionEnd);
      this.view.classList.add('hide-theme');
    }, 500, this);

    let onHideThemeTransitionEnd = () => {
      this.view.removeEventListener('transitionend', onHideThemeTransitionEnd);

      requestAnimationFrame(() => {
        this.renderTheme();
      });
    };

    this.wheel.addEventListener('render', (evt) => {
      let game = this.gameList[evt.detail.index];
      let src = getWheelImagePath(this.system, game.name) || '';
      let alt = game.description || game.name;
      evt.detail.element.innerHTML = '<wheel-image src="' + src + '" alt="' + alt + '"></wheel-image>';
    });

    this.wheel.addEventListener('change', (evt) => {
      this.activateWheel();
      onChange(evt);
    });

    this.wheel.addEventListener('select', (evt) => {
      let game = this.gameList[evt.detail.selectedIndex].name;
      // TODO: Determine if the selected item is another system or a game.
      if (this.system=="Main Menu")
        this.onSystemSelect(game);
      else
        this.onGameSelect(game);
    });

    this.wheel.addEventListener('exit', () => {
      requestAnimationFrame(() => {
        this.onExit();
      });
    });

    getGameList(this.system).then((gameList) => {
      this.gameList = gameList;
      this.wheel.itemCount = this.gameList.length;
    });
  }

  onWillHide() {
    this.foreground.pause();
  }

  onDidHide() {
    this.background.remove();
    this.foreground.remove();
  }

  onWillShow() {
    this.view.classList.add('hide-theme');
    this.view.classList.add('hide-wheel');
  }

  onDidShow() {
    if (_didFirstRender.get(this)) {
      this.renderTheme();
    } else {
      _didFirstRender.set(this, true);
    }

    requestAnimationFrame(() => {
      // Trigger re-flow.
      this.wheel.offsetHeight;
      this.view.classList.remove('hide-wheel');

      this.activateWheel();
    });
  }

  onBlur() {
    this.wheel.disabled = true;
  }

  onFocus() {
    this.wheel.disabled = false;
  }

  getSettings() {
    let settings = _settings.get(this);
    if (settings) {
      return settings;
    }

    settings = new Promise((resolve, reject) => {
      let settingsPath = getSettingsPath(this.system);
      fs.readFile(settingsPath, 'utf8', (error, string) => {
        if (error) {
          console.error(error);
          reject(error);
          return;
        }

        resolve(ini.parse(string));
      });
    });

    _settings.set(this, settings);
    return settings;
  }

  activateWheel(timeout = 1000) {
    clearTimeout(_wheelActiveTimeout.get(this));

    this.wheel.classList.add('active');

    _wheelActiveTimeout.set(this, setTimeout(() => {
      this.wheel.classList.remove('active');
    }, timeout));
  }

  renderTheme() {
    this.background.remove();
    this.foreground.remove();

    this.background = document.createElement('theme-background');
    this.view.prepend(this.background);

    this.foreground = document.createElement('theme-foreground');
    this.view.append(this.foreground);

    Promise.all([
      new Promise(resolve => this.background.addEventListener('render', resolve)),
      new Promise(resolve => this.foreground.addEventListener('render', resolve))
    ]).then(() => {
      this.view.classList.remove('hide-theme');
      this.foreground.play();
    });

    this.background.system = this.system;
    this.background.game = this.game;

    this.foreground.system = this.system;
    this.foreground.game = this.game;
  }

  onGameSelect(game) {
   console.log("launching:"+game);
   var child = require('child_process').execFile;
   var executablePath = "C:\\RocketLauncher\\RocketLauncher.exe";
   var parameters = [this.system,game];
   console.log("launching:");
   console.log(executablePath);
   console.log(parameters);

   child(executablePath, parameters, function(err, data) {
     console.log(err)
     console.log(data.toString());
   });
  }
  onSystemSelect(system) {}
  onExit() {}
}

module.exports = WheelMenuViewController;
