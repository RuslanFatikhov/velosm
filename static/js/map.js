// Инициализация карты
const ZOOM_LEVEL = 16; // Уровень зума для отображения дорог

const map = L.map('map').setView([51.505, -0.09], ZOOM_LEVEL);

// Добавление тайлов
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

// Группа слоёв для путей
const roadsLayer = L.layerGroup().addTo(map);

import { handlePanelUpdate } from './panel.js'; // Импорт функции для обновления панели

// Функция для определения стиля линии
function getRoadStyle(highwayType, tags) {
    if (tags.cycleway === 'lane' || tags['cycleway:right'] === 'lane' || tags['cycleway:left'] === 'lane' || tags['cycleway:both'] === 'lane') {
        return { color: 'red', weight: 3, opacity: 1 }; // Дороги с велополосами
    }
    if (tags.bicycle === 'designated') {
        return { color: 'pink', weight: 2, opacity: 1 }; // Велопешеходные дорожки
    }
    switch (highwayType) {
        case 'road': // Автомобильные дороги
            return { color: 'white', weight: 4, opacity: 1, dashArray: '1, 0', lineJoin: 'round', stroke: true, outline: 'gray' };
        case 'footway': // Пешеходные дорожки
            return { color: 'yellow', weight: 2, opacity: 1, dashArray: '4, 2' };
        case 'cycleway': // Велодорожки
            return { color: 'green', weight: 3, opacity: 1 };
        default: // Другие линии
            return { color: 'blue', weight: 2, opacity: 0.5 };
    }
}

// Функция для загрузки данных дорог с OpenStreetMap через Overpass API
function fetchRoads(bounds) {
    const overpassApiUrl = "https://overpass-api.de/api/interpreter";
    const query = `
        [out:json];
        way["highway"](${bounds.getSouth()},${bounds.getWest()},${bounds.getNorth()},${bounds.getEast()});
        out body;
        >;
        out skel qt;
    `;

    console.log("Fetching roads for bounds:", bounds);

    fetch(overpassApiUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded"
        },
        body: query
    })
    .then(response => response.json())
    .then(data => {
        console.log("Overpass API response:", data);

        const roads = data.elements.filter(el => el.type === "way");
        roadsLayer.clearLayers(); // Удаляем старые слои

        if (roads.length === 0) {
            console.warn("No roads found for current bounds.");
        }

        roads.forEach(road => {
            const coordinates = road.nodes.map(nodeId => {
                const node = data.elements.find(el => el.id === nodeId && el.type === "node");
                return node ? [node.lat, node.lon] : null;
            }).filter(coord => coord !== null);
        
            if (coordinates && coordinates.length > 0) {
                const highwayType = road.tags.highway || 'unknown';
                const polyline = L.polyline(coordinates, getRoadStyle(highwayType, road.tags)).addTo(roadsLayer);
        
                polyline.on('click', () => {
                    console.log("Road clicked, passing data to handlePanelUpdate:", { road, coordinates });
                    try {
                        handlePanelUpdate(road, coordinates); // Передаём данные в панель
                    } catch (error) {
                        console.error("Error updating panel for road:", road, error);
                    }
                });
            } else {
                console.warn('No valid coordinates found for road:', road);
            }
        });
        
        
        
    })
    .catch(error => console.error("Error loading OSM data:", error));
}

// Функция для определения и отображения местоположения
function locateUser() {
    if (!navigator.geolocation) {
        alert("Геолокация не поддерживается вашим браузером.");
        return;
    }

    navigator.geolocation.getCurrentPosition(
        function (position) {
            const { latitude, longitude } = position.coords;

            // Сохранение местоположения в localStorage
            localStorage.setItem('userLocation', JSON.stringify({ latitude, longitude }));

            // Центрируем карту на текущем местоположении
            map.setView([latitude, longitude], ZOOM_LEVEL);

            // Добавляем маркер на текущем местоположении
            L.marker([latitude, longitude], { title: "Вы здесь!" }).addTo(map)
                .bindPopup("Вы здесь!")
                .openPopup();
        },
        function () {
            alert("Не удалось определить ваше местоположение.");
        }
    );
}

// Установка карты на сохранённое местоположение, если оно доступно
const savedLocation = localStorage.getItem('userLocation');
if (savedLocation) {
    const { latitude, longitude } = JSON.parse(savedLocation);
    map.setView([latitude, longitude], ZOOM_LEVEL);
    L.marker([latitude, longitude], { title: "Ваше сохранённое местоположение" }).addTo(map)
        .bindPopup("Ваше сохранённое местоположение")
        .openPopup();
} else {
    // Если местоположение не сохранено, попытаться определить текущее
    locateUser();
}

// Кнопка для определения местоположения
document.getElementById('locateMe').addEventListener('click', locateUser);

// Проверка уровня зума и загрузка данных
map.on('moveend', function () {
    const bounds = map.getBounds(); // Текущая видимая область
    const zoomLevel = map.getZoom(); // Текущий уровень зума

    console.log("Current zoom level:", zoomLevel);

    if (zoomLevel >= ZOOM_LEVEL) {
        console.log("Fetching roads for visible area...");
        fetchRoads(bounds);
    } else {
        roadsLayer.clearLayers(); // Очищаем слои путей при изменении зума
        console.log("Zoom level not suitable for loading roads.");
    }
});

// Инициализация: загрузка данных для начальной области при зуме >= ZOOM_LEVEL
if (map.getZoom() >= ZOOM_LEVEL) {
    fetchRoads(map.getBounds());
}
