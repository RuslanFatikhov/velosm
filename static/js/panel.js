// Глобальная переменная для текущей выбранной дороги
let currentRoad = null;

// Функция для обновления панели
function handlePanelUpdate(road, coordinates) {
    // Проверяем, что координаты существуют и валидны
    if (!coordinates || !Array.isArray(coordinates) || coordinates.length === 0) {
        console.error('Invalid coordinates passed to handlePanelUpdate:', coordinates);
        document.getElementById('roadLength').value = "Нет данных";
        hideField('roadLength');
        return;
    }

    // Функция для скрытия полей, если значение пустое или отсутствует
    function updateField(fieldId, value) {
        const field = document.getElementById(fieldId);
        if (value === "Не указано" || value === "Нет данных" || value === "Нет") {
            field.parentElement.style.display = 'none';
        } else {
            field.parentElement.style.display = 'block';
            field.value = value;
        }
    }

    // Обновляем данные в панели
    updateField('roadName', road.tags.name || "Не указано");
    updateField('roadType', road.tags.highway || "Не указано");
    updateField('roadSurface', road.tags.surface || "Не указано");
    updateField('roadSmoothness', road.tags.smoothness || "Не указано");

    // Попытка расчёта длины дороги
    try {
        const formattedCoordinates = coordinates.map(coord => [coord[0], coord[1]]);
        const length = L.GeometryUtil.length(formattedCoordinates);
        updateField('roadLength', `${length.toFixed(2)} м`);
    } catch (error) {
        console.error("Error calculating road length:", error);
        updateField('roadLength', "Нет данных");
    }

    // Cycleway информация
    if (road.tags['cycleway:both'] === "no" || road.tags['cycleway'] === "no") {
        hideField('roadCycleway');
    } else if (road.tags.highway === "footway" && road.tags.bicycle === "designated") {
        let cyclewayInfo = "Велодорожка на пешеходной дорожке";
        updateField('roadCycleway', cyclewayInfo);
    } else if (road.tags.highway === "cycleway" && road.tags.foot === "designated") {
        let cycleFootwayInfo = "Велосипедно-пешеходная дорожка";
        updateField('roadCycleway', cycleFootwayInfo);
    } else {
        const cycleway = road.tags.cycleway || road.tags['cycleway:right'] || road.tags['cycleway:left'] || road.tags['cycleway:both'];
        if (cycleway) {
            const cyclewayPosition = road.tags['cycleway:right'] ? "справа" : road.tags['cycleway:left'] ? "слева" : "с обеих сторон";
            const isOneWay = road.tags['oneway:bicycle'] === "yes" ? "(односторонняя)" : "(двусторонняя)";
            updateField('roadCycleway', `${cycleway} ${cyclewayPosition} ${isOneWay}`);
        } else {
            hideField('roadCycleway');
        }
    }

// Segregation информация
if (road.tags.segregated === "yes") {
    updateField('roadSegregation', "Пешеходная дорожка и велодорожка разделены");
} else {
    hideField('roadSegregation');
}


    // Busway информация
    const busway = road.tags['busway:right'] || road.tags['busway:left'] || road.tags['busway:both'];
    if (busway) {
        const buswayPosition = road.tags['busway:right'] ? "справа" : road.tags['busway:left'] ? "слева" : "с обеих сторон";
        updateField('roadBusway', `Автобусная линия ${buswayPosition}`);
    } else {
        updateField('roadBusway', "Нет");
    }

    // Сохраняем текущую дорогу
    currentRoad = road;
}

// Функция для скрытия поля
function hideField(fieldId) {
    const field = document.getElementById(fieldId);
    field.parentElement.style.display = 'none';
}

export { handlePanelUpdate };
