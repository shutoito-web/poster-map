function getBlockFromUrlParam() {
  const params = new URL(document.location.href).searchParams
  const block = params.get("block")
  console.log(block)
  return block
}

function getSmallBlockFromUrlParam() {
  const params = new URL(document.location.href).searchParams
  const smallBlock = params.get("sb")
  console.log(smallBlock)
  return smallBlock
}

function findKeyByAreaName(data, areaName) {
  for (const key in data) {
    if (data[key].area_name === areaName) {
      return key;
    }
  }
  return null;
}

function filterDataByAreaIdAndSmallBlock(data, areaId, smallBlockId) {
  return data.filter(item => {
      return item.area_id === areaId && item.name.split('-')[0] === String(smallBlockId);
  });
}

function getStatusText(status) {
  statusDict = {0: "未", 1: "完了", 2: "異常", 3: "予約", 4: "要確認", 5: "異常対応中", 6: "削除"}
  return statusDict[status]
}

function getStatusColor(status) {
switch (status) {
  case 0:
    return '#0288D1';
  case 1:
    return '#FFD600';
  case 2:
    return '#E65100';
  case 3:
    return '#0F9D58';
  case 4:
    return '#FF9706';
  case 5:
    return '#9106E9';
  case 6:
    return '#FFD600';
  default:
    return '#0288D1';
}
}

function getPinNote(note) {
  if (note == null) {
    return "なし"
  } else {
    return note
  }
}

function getPinAddress(address) {
  if (address == null || address === "") {
    return "情報なし"
  } else {
    return address
  }
}

async function loadBoardPins(pins, layer, status=null) {
  const areaList = await getAreaList();
  if (status != null) {
    pins = pins.filter(item => item.status == status);
  }
  pins.forEach(pin => {
    if (pin.lat == null || pin.long == null) {
      console.error('Invalid pin data (lat/long is null):', pin);
      return; // 座標が不正なピンはスキップ
    }
    var marker = L.circleMarker([pin.lat, pin.long], {
      radius: 8,
      color: 'black',
      weight: 1,
      fillColor: `${getStatusColor(pin.status)}`,
      fillOpacity: 0.9,
      border: 1,
    })
    .addTo(layer);
    marker.bindPopup(`<b>${areaList[pin.area_id]["area_name"]} ${pin.name}</b><br>ステータス: ${getStatusText(pin.status)}<br>備考: ${getPinNote(pin.note)}<br>住所: ${getPinAddress(pin.address)}<br>座標: <a href="https://www.google.com/maps/search/${pin.lat},+${pin.long}" target="_blank" rel="noopener noreferrer">(${pin.lat}, ${pin.long})</a><hr><a href="https://script.google.com/macros/s/AKfycbxcQ_3FreTzUq7Ho3Y0b8RIkHIA0t6yG36cCs73g85ri71dEuFZ3VW2L7R259EPTVhz/exec?row=${pin.row_num}" target="_blank" rel="noopener noreferrer">ステータスを更新する</a>`);
  });
}

function onLocationError(e) {
  // alert(e.message);
  const mapConfig = {
    'sendai': {
      'lat': 38.2682,
      'long': 140.8721,
      'zoom': 12,
    },
    'ishinomaki': {
      'lat': 38.435,
      'long': 141.302,
      'zoom': 11,
    },
    'sensen': {
      'lat': 38.316,
      'long': 141.022,
      'zoom': 11,
    },
    'kesennuma-motoyoshi': {
      'lat': 38.905,
      'long': 141.569,
      'zoom': 11,
    },
    'sennan': {
      'lat': 38.05,
      'long': 140.73,
      'zoom': 11,
    },
    'tome': {
      'lat': 38.69,
      'long': 141.18,
      'zoom': 11,
    },
    'kurihara': {
      'lat': 38.73,
      'long': 141.02,
      'zoom': 11,
    },
    'osaki': {
      'lat': 38.57,
      'long': 140.95,
      'zoom': 11,
    },
  }
  const block = getBlockFromUrlParam()
  let latlong, zoom;
  if (block == null) {
    latlong = [38.26, 140.87],
    zoom = 9
  } else {
    latlong = [mapConfig[block]['lat'], mapConfig[block]['long']]
    zoom = mapConfig[block]['zoom']
  }
  map.setView(latlong, zoom);
}

const baseLayers = {
  'OpenStreetMap': osm,
  'Google Map': googleMap,
  '国土地理院地図': japanBaseMap,
};

const overlays = {
  '未':  L.layerGroup(),
  '完了':  L.layerGroup(),
  '異常':  L.layerGroup(),
  '要確認':  L.layerGroup(),
  '異常対応中':  L.layerGroup(),
  '削除':  L.layerGroup(),
  '期日前投票所':  L.layerGroup(),
};

var map = L.map('map', {
  layers: [
    overlays['未'],
    overlays['完了'],
    overlays['要確認'],
    overlays['異常'],
    overlays['異常対応中'],
    overlays['削除'],
    overlays['期日前投票所']
  ],
  preferCanvas:true,
});
japanBaseMap.addTo(map);
const layerControl = L.control.layers(baseLayers, overlays).addTo(map);

function onLocationFound(e) {
  map.setView(e.latlng, 14);
  L.marker(e.latlng).addTo(map);
}

const block = getBlockFromUrlParam()
const smallBlock= getSmallBlockFromUrlParam()

onLocationError();

let allBoardPins;
getBoardPins(block, smallBlock).then(function(pins) {
  allBoardPins = pins
  loadBoardPins(allBoardPins, overlays['削除'], 6);
  loadBoardPins(allBoardPins, overlays['完了'], 1);
  loadBoardPins(allBoardPins, overlays['異常'], 2);
  loadBoardPins(allBoardPins, overlays['要確認'], 4);
  loadBoardPins(allBoardPins, overlays['異常対応中'], 5);
  loadBoardPins(allBoardPins, overlays['未'], 0);
});

Promise.all([getProgress(), getProgressCountdown()]).then(function(res) {
  progress = res[0];
  progressCountdown = res[1];
  progressBox((progress['total']*100).toFixed(2), 'topleft').addTo(map)
  progressBoxCountdown((parseInt(progressCountdown['total'])), 'topleft').addTo(map)
}).catch((error) => {
  console.error('Error in fetching data:', error);
});

loadVoteVenuePins(overlays['期日前投票所']);