const axios = require('axios');
const config = require('./config');

const url = 'http://api.openweathermap.org/data/2.5/onecall?'

const getWeather = async () => {
    
    var weather = {};
    
    try {

        // Form request query
        var request = url + 'lat=' + config.lat + '&lon=' + config.lon;
        request += '&exclude=minutely,hourly,alerts' + '&units=imperial';
        request += '&appid=' + config.openWeatherKey;

        const response = await axios.get(request);

        weather.temp = Math.round(response.data.current.temp);
        weather.sky = response.data.current.weather[0].main;

        switch(response.data.current.weather[0].icon) {
            case '11d':
                weather.icon = 'weather-storm';
                break;
            case '11n':
                weather.icon = 'weather-storm';
                break;
            case '09d':
                weather.icon = 'weather-showers-day';
                break;
            case '09n':
                weather.icon = 'weather-showers-night';
                break;
            case '10d':
                weather.icon = 'weather-showers';
                break;
            case '10n':
                weather.icon = 'weather-showers';
                break;
            case '13d':
                weather.icon = 'weather-snow-scattered-day';
                break;
            case '13n':
                weather.icon = 'weather-snow-scattered-night';
                break;
            case '50d':
                weather.icon = 'weather-mist';
                break;
            case '50n':
                weather.icon = 'weather-mist';
                break;
            case '01d':
                weather.icon = 'weather-clear';
                break;
            case '01n':
                weather.icon = 'weather-clear-night';
                break;
            case '02d':
                weather.icon = 'weather-few-clouds';
                break;
            case '02n':
                weather.icon = 'weather-few-clouds-night';
                break;
            case '03d':
                weather.icon = 'weather-many-clouds';
                break;
            case '03n':
                weather.icon = 'weather-many-clouds';
                break;
            case '04d':
                weather.icon = 'weather-many-clouds';
                break;
            case '04n':
                weather.icon = 'weather-many-clouds';
                break;
            default:
                weather.icon = 'weather-none-available';
        }

        var weatherID = response.data.current.weather[0].id;

        if(weatherID == 511) {
            weather.icon = 'weather-freezing-rain';
        }
        if(weatherID == 615 || weatherID == 616) {
            weather.icon = 'weather-snow-rain';
        }
        if(weatherID == 602 || weatherID == 622) {
            weather.icon = 'weather-snow';
        }

        weather.min = Math.round(response.data.daily[0].temp.min);

        console.log(weather);

    } catch (error) {
        console.log(error);
    }

}

(async () => {
    await getWeather();
})();