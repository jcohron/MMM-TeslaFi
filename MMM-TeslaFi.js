/* Magic Mirror
 * Module: MMM-TeslaFi
 *
 * Originally By Adrian Chrysanthou
 * Updated by Matt Dyson
 * MIT Licensed.
 */
Module.register('MMM-TeslaFi', {
	defaults: {
		units: config.units,
		animationSpeed: 1000,
		refreshInterval: 1000 * 60, //refresh every minute
		updateInterval: 1000 * 3600, //update every hour
		lang: config.language,
		initialLoadDelay: 0, // 0 seconds delay
		retryDelay: 2500,
		imperial: true,
		batteryDanger: 50,
		batteryWarning: 75,
		apiBase: 'https://www.teslafi.com/feed.php?token=',
		apiQuery: '&command=lastGood',
//		items: [ 'battery', 'batteryex', 'range', 'range-estimated', 'power-connected', 'charge-time', 'charge-added', 'locked', 'odometer', 'temperature', 'temperatureF' ],
		items: [ 'batteryex', 'odometer', 'temperatureF' ],
	},
	// Define required scripts.
	getScripts: function() {
		return [
			'MMM-TF-Utilities.js',
			'https://cdnjs.cloudflare.com/ajax/libs/lodash.js/4.17.11/lodash.min.js',
			'https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.24.0/moment.min.js',
			'moment.js'
			];
	},
	getStyles: function() {
		return [
			'https://cdnjs.cloudflare.com/ajax/libs/material-design-iconic-font/2.2.0/css/material-design-iconic-font.min.css',
			'MMM-TeslaFi.css'
			];
	},
	start: function() {
		Log.info('Starting module: ' + this.name);
		this.loaded = false;
		this.sendSocketNotification('CONFIG', this.config);
	},
	getDom: function() {
		var wrapper = document.createElement("div");
		if (!this.loaded) {
			wrapper.innerHTML = this.translate('LOADING');
			wrapper.className = "dimmed light small";
			return wrapper;
		}
		if (this.config.apiKey === "") {
			wrapper.innerHTML = "No Tesla Fi <i>apiKey</i> set in config file.";
			wrapper.className = "dimmed light small";
			return wrapper;
		}
		if (!this.data) {
			wrapper.innerHTML = "No data";
			wrapper.className = "dimmed light small";
			return wrapper;
		}
		var t = this.data;
		var content = document.createElement("div");

		content.innerHTML = "";
		var table = `<h2 class="mqtt-title"><span class="zmdi zmdi-car zmdi-hc-1x icon"></span> ${t.display_name}`;
		if(t.locked!="1") {
			table += ` - <span class="security-warning">Unlocked</span>`;
		}
		
		table += `</h2>
		<table class="small">
		`;

		for(field in this.config.items) {

		switch (this.config.items[field]) {
			case 'battery':
				table += `
				   <tr>
				      <td class="icon"><span class="zmdi zmdi-battery zmdi-hc-fw"></span></td>
				      <td class="field">Battery</td>
				      <td class="value">
				         <span class="battery-level-${getStatusColor(t.usable_battery_level, this.config.batteryWarning, this.config.batteryDanger)}">${t.usable_battery_level}%</span>
                                         /
                                         <span class="battery-level-${getStatusColor(t.charge_limit_soc, this.config.batteryWarning, this.config.batteryDanger)}">${t.charge_limit_soc}%</span>
				      </td>
				   </tr>
				`;
			break;

			case 'batteryex':

				if(t.charging_state!="Disconnected") {
					table += `<tr>
						<td class="icon"><span class="zmdi zmdi-input-power zmdi-hc-fw"></span></td>
						<td class="field">${getChargerStatus(t.charging_state, t.scheduled_charging_pending)}</td>
					`;
				} else {
					table += `<tr>
					  <td class="icon"><span class="zmdi zmdi-battery zmdi-hc-fw"></span></td>
					  <td class="field"><span class="battery-level-${getStatusColor(t.usable_battery_level, this.config.batteryWarning, this.config.batteryDanger)}">Disconnected</span></td>
					`;
				}
				table += `
					<td class="value">
						${parseFloat(t.est_battery_range).toFixed(0)}&nbsp;miles&nbsp;
						<span class="battery-level-${getStatusColor(t.usable_battery_level, this.config.batteryWarning, this.config.batteryDanger)}">${t.usable_battery_level}%</span>
						 /
						<span class="battery-level-${getStatusColor(t.charge_limit_soc, this.config.batteryWarning, this.config.batteryDanger)}">${t.charge_limit_soc}%</span>
					</td>
				</tr>
				`;
				
			break;

			case 'range':
				table += `
				   <tr>
				      <td class="icon"><span class="zmdi zmdi-gas-station zmdi-hc-fw"></span></td>
				      <td class="field">Range</td>
				      <td class="value">${t.ideal_battery_range} miles</td>
				   </tr>
				`;
			break;

			case 'range-estimated':
				table += `
				   <tr>
				      <td class="icon"><span class="zmdi zmdi-gas-station zmdi-hc-fw"></span></td>
				      <td class="field">Range</td>
				      <td class="value">${t.est_battery_range} miles (estimated)</td>
				   </tr>
				`;
			break;

			case 'charge-time':
				if(!t.charging_state || t.time_to_full_charge==0) { break; }

				table += `
				   <tr>
				      <td class="icon"><span class="zmdi zmdi-battery-flash zmdi-hc-fw"></span></td>
				      <td class="field">Charging</td>
				      <td class="value">${moment().add(t.time_to_full_charge, "hours").fromNow()}</td>
				   </tr>
				`;
			break;

			case 'charge-added':
				if(t.charging_state=="Disconnected") { break; }

				table += `
				   <tr>
				      <td class="icon"><span class="zmdi zmdi-flash zmdi-hc-fw"></span></td>
				      <td class="field">Charge Added</td>
				      <td class="value">${t.charge_energy_added} kWh</td>
				   </tr>
				`;

			break;

			case 'locked':
				if(t.locked) {

				table += `
				   <tr>
				      <td class="icon"><span class="zmdi zmdi-lock-outline zmdi-hc-fw"></span></td>
				      <td class="field" colspan="2">Locked</td>
				   </tr>
				`;

				} else {

				table += `
				   <tr>
				      <td class="icon"><span class="zmdi zmdi-lock-open zmdi-hc-fw"></span></td>
				      <td class="field" colspan="2">Unlocked</td>
				   </tr>
				`;

				}
			break;

			case 'odometer':
				table += `
				   <tr>
				      <td class="icon"><span class="zmdi zmdi-globe zmdi-hc-fw"></span></td>
				      <td class="field">Odometer</td>
				      <td class="value">${parseFloat(t.odometer).toLocaleString('en-US', {maximumFractionDigits:0})} miles</td>
				   </tr>
				`;
			break;

			case 'temperature':
				if(!t.outside_temp || !t.inside_temp) { break; }

				table += `
				   <tr>
				      <td class="icon"><span class="zmdi zmdi-sun zmdi-hc-fw"></span></td>
				      <td class="field">Temperature</td>
				      <td class="value">${t.outside_temp}&deg;C / ${t.inside_temp}&deg;C</td>
				   </tr>
				`;
			break;

			case 'temperatureF':
				if(!t.outside_tempF || !t.inside_tempF) { break; }

				table += `
				   <tr>
				      <td class="icon"><span class="zmdi zmdi-sun zmdi-hc-fw"></span></td>
				      <td class="field">Temperature</td>
				      <td class="value">${t.outside_tempF}&deg;F / ${t.inside_tempF}&deg;F</td>
				   </tr>
				`;
			break;

			case 'power-connected':
				if(t.charging_state!="Disconnected") {

				table += `
				   <tr>
				      <td class="icon"><span class="zmdi zmdi-input-power zmdi-hc-fw"></span></td>
				      <td class="field">Connected</td>
				      <td class="value">${t.charging_state}</td>
				   </tr>
				`;

				} else {

				table += `
				   <tr>
				      <td class="icon"><span class="zmdi zmdi-input-power zmdi-hc-fw"></span></td>
				      <td class="field" colspan="2">Disconnected</td>
				   </tr>
				`;

				}
			break;

			case 'data-time':
				table += `
				   <tr>
				      <td class="icon"><span class="zmdi zmdi-time zmdi-hc-fw"></span></td>
				      <td class="field" colspan="2">${moment(t.Date).fromNow()}</td>
				   </tr>
				`;
			break;
		} // switch

		} // end foreach loop of items

		if (t.charge_energy_added) {
			table += `<tr><td colspan="2" class="updateinfoleft">Last Charge Added ${t.charge_energy_added} kWh</td>`;
		} else {
			table += `<tr><td colspan="2" class="updateinfoleft">&nbsp</td>`;			
		}
		table += `<td class="updateinforight">Updated ${moment(t.Date).fromNow()}</td></tr>`;
		table += "</table>";

		wrapper.innerHTML = table;
		wrapper.className = "light small";
		wrapper.appendChild(content);
		return wrapper;
	},
	socketNotificationReceived: function(notification, payload) {
		if (notification === "STARTED") {
			this.updateDom();
		} else if (notification === "DATA") {
			this.loaded = true;
			this.tFi(JSON.parse(payload));
			this.updateDom();
		}
	},
	// tFi(data)
	// Uses the received data to set the various values.
	//argument data object - info from teslfi.com
	tFi: function(data) {
		if (!data) {
			// Did not receive usable new data.
			return;
		}
		this.data = data;
		this.loaded = true;
		this.updateDom(this.config.animationSpeed);
	}
});
