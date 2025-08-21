import { ref } from 'vue';

const indexOptions = ref([
	{ text: 'Heat Vulnerability', value: 'heat_index', description: 'Total social vulnerability to high temperatures. Includes factors like age, income, and housing conditions.' },
	{ text: 'Flood Vulnerability', value: 'flood_index', description: 'Total social vulnerability to flooding. Considers factors such as age, income, overcrowding, and green space.' },
	{ text: 'Sensitivity', value: 'sensitivity', description: 'Sensitivity to flooding and high temperatures. Calculated from the percentage of people over 75 years old and the percentage of children aged 0-6 years.' },
	{ text: 'Flood Exposure', value: 'flood_exposure', description: 'Enhanced exposure to flooding. Based on green space coverage in the area.' },
	{ text: 'Flood Preparedness', value: 'flood_prepare', description: 'Ability to prepare for flooding. Includes indicators such as income, employment, social networks, and housing tenure.' },
	{ text: 'Flood Response', value: 'flood_respond', description: 'Ability to respond to flooding. Includes access to emergency services, information, and economic stability.' },
	{ text: 'Flood Recovery', value: 'flood_recover', description: 'Ability to recover after flooding. Takes into account economic factors, housing conditions, and social support networks.' },
	{ text: 'Heat Exposure', value: 'heat_exposure', description: 'Enhanced exposure to high temperatures. Based on factors like housing conditions and the amount of vegetation.' },
	{ text: 'Heat Preparedness', value: 'heat_prepare', description: 'Ability to prepare for high temperatures. Considers economic and social factors, as well as housing conditions.' },
	{ text: 'Heat Response', value: 'heat_respond', description: 'Ability to respond to high temperatures. Similar factors as preparedness, focusing on response capabilities.' },
	{ text: 'Age', value: 'age', description: 'Age-based vulnerability. Combines the percentage of young children (0-6 years old) and elderly people (over 75 years old).' },
	{ text: 'Information', value: 'info', description: 'Information-based vulnerability. Calculated from the percentage of people with only basic education.' },
	{ text: 'Tenure', value: 'tenure', description: 'Tenure-based vulnerability. Includes the percentage of rented households and those rented from ARA (The Housing Finance and Development Centre of Finland).' },
	{ text: 'Green Space', value: 'green', description: 'Greenspace availability. Considers the percentage of water area, green space, low vegetation, and tree coverage in the land area.' },
	{ text: 'Social Networks', value: 'social_networks', description: 'Social network-based vulnerability. Includes the percentage of students, single-person households, and school-age children in the population.' },
	{ text: 'Overcrowding', value: 'overcrowding', description: 'Overcrowding vulnerability. Based on the occupancy rate and the percentage of households with seven or more people.' },
    { text: 'Landsat surface heat', value: 'avgheatexposure', description: 'Landsat surface heat 2023-06-28 (not combined)' },
    { text: 'Combined Landsat surface heat', value: 'combined_avgheatexposure', description: 'Combined Landsat surface heat  2023-06-28 and heat index' },
    { text: 'Heat and Landsat surface heat combined', value: 'combined_heatindex_avgheatexposure', description: 'Landsat surface heat and heat vulnerability combined' },
    { text: 'Combined Indices (Heat/Flood)', value: 'combined_heat_flood', description: 'Combined heat and flood vulnerability, colored by heat and height by flood.' },
    { text: 'Combined Indices (Flood/Heat)', value: 'combined_flood_heat', description: 'Combined heat and flood vulnerability, colored by flood and height by heat.' },
    { text: 'Combined Indices (Heat/Flood/Green)', value: 'combined_heat_flood_green', description: 'Combined heat and flood vulnerability, colored by heat and flood, height by green space.' },
]);

export function useIndexData() {
    const getIndexInfo = (indexValue) => {
        return indexOptions.value.find(option => option.value === indexValue);
    };

    return {
        indexOptions,
        getIndexInfo,
    };
}