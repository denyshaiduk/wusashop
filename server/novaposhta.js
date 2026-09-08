'use strict';

const NP_URL = 'https://api.novaposhta.ua/v2.0/json/';

async function callNovaPoshta(body) {
  const res = await fetch(NP_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('Nova Poshta API request failed');
  return res.json();
}

async function searchCities(apiKey, query) {
  const data = await callNovaPoshta({
    apiKey,
    modelName: 'Address',
    calledMethod: 'searchSettlements',
    methodProperties: { CityName: query, Limit: 15, Page: 1 },
  });
  const items = (data.data && data.data[0] && data.data[0].Addresses) || [];
  return items.map((a) => ({ ref: a.DeliveryCity, name: a.MainDescription, area: a.Area || a.Region || '' }));
}

async function searchWarehouses(apiKey, cityRef) {
  const data = await callNovaPoshta({
    apiKey,
    modelName: 'AddressGeneral',
    calledMethod: 'getWarehouses',
    methodProperties: { CityRef: cityRef, Limit: 500 },
  });
  const items = data.data || [];
  return items.map((w) => ({ ref: w.Ref, name: w.Description }));
}

module.exports = { searchCities, searchWarehouses };
