// const fetch = require("node-fetch");

let apiData;
const HOST = 'http://api.coxauto-interview.com';

apiCall();

function apiCall() {
    fetch(`${HOST}/api/datasetId`)
        .then(response => response.json())
        .then(datasetId => apiData = datasetId)
        .then(() => getVehicleId())
        .then(() => console.log(apiData))
        .catch();
}

function getVehicleId() {
    let vehicles;
    fetch(`${HOST}/api/${apiData.datasetId}/vehicles/`)
        .then(response => response.json())
        .then(result => vehicles = result)
        .then(() => getVehicles(vehicles))
}

const getVehicleInfo = (apiData, vehicleId) => {
    return fetch(`${HOST}/api/${apiData.datasetId}/vehicles/${vehicleId}`)
    .then(response => response.json())
}

const getDealerInfo = (apiData, dealerId) => {
    return fetch(`${HOST}/api/${apiData.datasetId}/dealers/${dealerId}`)
    .then(response => response.json())
}

// Gathering vehicles data
function getVehicles(vehicles) {
    const vehiclePromises = [];
    for (let vehicleId of Object.values(vehicles.vehicleIds)) {
        const fetching = getVehicleInfo(apiData, vehicleId);
        vehiclePromises.push(fetching);
    }
    
    Promise.all(vehiclePromises).then((vehicleArr) => {
        let dealerSet = new Set();
        vehicleArr.forEach((vehicleInfo) => {
            dealerSet.add(vehicleInfo.dealerId)
        })
        const dealerPromises = [];
        dealerSet.forEach((dealerId) => {
            const dealerFetchCall = getDealerInfo(apiData, dealerId);
            dealerPromises.push(dealerFetchCall);
        })

        Promise.all(dealerPromises).then((dealerArr) => {
            let result = getMapfromArray(vehicleArr, dealerArr);
            let answer = reformatToResult(result, vehicleArr);
            console.log(answer);

            // Fetching to answer endpoint
            fetch(`${HOST}/api/${apiData.datasetId}/answer`, {
                method: 'POST',
                body: JSON.stringify(answer),
                headers: {
                    "Success": "application/json",
                    "Content-Type": "application/json-patch+json;"
                }
            })
            .then(response => response.json())
            
        })
        return 0;
    })
}

// Mapping data
const getMapfromArray = (vehiclesList, dealersList) => {
    const resultMap = {};
    vehiclesList.forEach((value) => {
        const vehicleId = value.vehicleId;
        const dealerId = value.dealerId;

        dealersList.forEach((value) => {
            const dealerName = value.name;
            const dealerId = value.dealerId;

            if (!(dealerId in resultMap) && !(dealerName in resultMap)) {
                let payload = {
                    name: `${dealerName}`,
                    vehicles: []
                }
                resultMap[dealerId] = payload;
            }
        });
        
        let vehiclesList = resultMap[dealerId]['vehicles'];
        vehiclesList.push(vehicleId);
    });
    return resultMap;
}

// Iterating through map using key dealerId to generate structure
const reformatToResult = (result, resultArr) => {
    const dealerMap = [];
    for (const dealer of Object.entries(result)) {
        let formatting = {
            dealerId: dealer[0],
            name: dealer[1].name,
            vehicles: []
        }

        for (const vehicle of Object.values(dealer[1].vehicles)) {
            let vehicleInfo = {};
            for (let i = 0; i < resultArr.length; i++) {
                if (vehicle == resultArr[i].vehicleId) {
                    vehicleInfo = {
                        vehicleId: resultArr[i].vehicleId,
                        year: resultArr[i].year,
                        make: resultArr[i].make,
                        model: resultArr[i].model
                    }
                }
            }
            formatting.vehicles.push(vehicleInfo)
        }

        dealerMap.push(formatting);
    }

    return {
        'dealers': dealerMap
    }
}