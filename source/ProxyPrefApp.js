enyo.kind({
	name: "ProxyPrefApp",
	kind: "VFlexBox",
	defaultServer: "proxy.webosarchive.org",
	defaultPort: 3128,
	certRemotePath: "http://www.webosarchive.org/proxy/wOSAServiceCert.der",
	certLocalPath: "/media/internal/wOSAServiceCert.der",
	certLocalPathNetwork: "/media/internal/localCert.der",
	activeCertLocalPath: "",
	proxyOn: false,
	proxyType: "ondevice",

	components:[
		{kind: "PalmService", name: "configureNwProxiesCall", service: "palm://com.palm.connectionmanager/", method: "configureNwProxies", onResponse: "handleConnectionStatus" },
		{kind: "PalmService", name: "fileDownload", service: "palm://com.palm.downloadmanager/", method: "download", onSuccess: "downloadFinished", onFailure: "downloadFail", subscribe: true },
		{kind: "PalmService", name: "certInstallRequest", service: "palm://com.palm.certificatemanager", method: "addcertificate", onSuccess: "certificateAddSuccess", onFailure: "certificateAddFailure" },
		{kind: "PalmService", name: "launchAppRequest", service: "palm://com.palm.applicationManager/", method: "open", onSuccess: "", onFailure: "certificateLaunchFailure" },
		{kind: "PalmService", name: "squidLaunchRequest", service: "palm://com.palm.applicationManager/", method: "open", onSuccess: "squidLaunchSuccess", onFailure: "squidLaunchFailure" },
		{kind: "ApplicationEvents", onWindowActivated: "handleActivate", onWindowDeactivated: "handleDeactivate", onApplicationRelaunch: "handleLaunchParam"},

		{kind: "Toolbar", pack: "center", name:"toolbarTop", className: "enyo-toolbar-light wifi-header", components: [
			{kind: "Spacer", name:"spacerTP", flex: 1, showing: true },
			{kind: "HFlexBox", pack: "center", name:"headerIcon", align: "center", components: [
				{className: "header-icon"},
				{content: $L("Proxy"), name: "headerTitle", className: "headerTitle"}
			]},
			{kind: "Spacer", name:"spacerPhone", flex: 1, showing: false },
			{flex: 1, components: [{kind: "ToggleButton", flex: 1, name: "proxyToggleButton", style: "float: right; padding: 0px;", showing:false, onChange: "handleProxyToggleChange"}]}
		]},
		{className:"wifi-header-shadow"},
		{className:"touchpad-margin", name: "tpmargin"},

		{kind: "Scroller", flex: 1, className: "box-center", name: "mainscroller", components: [

			{kind: "RowGroup", caption: "Proxy Type", components: [
				{style: "position: relative;", components: [
					{kind: "RadioGroup", name: "proxyTypeGroup", onChange: "proxyTypeChanged", components: [
						{caption: $L("On-Device"), value: "ondevice"},
						{caption: $L("Self-Host"), value: "network"},
						{caption: $L("Custom"), value: "custom"}
					]},
					{name: "proxyTypeBlocker", showing: false, style: "position: absolute; top: 0; left: 0; width: 100%; height: 100%;"}
				]}
			]},

			{kind: "RowGroup", caption: "Server", name: "serverGroup", pack: "center", align: "start", components: [
				{name: "proxyServer", kind: "Input", value: "", pack: "center", align: "start", lazy: false, onchange: "serverChanged"}
			]},

			{kind: "RowGroup", caption: "Port", name: "portGroup", pack: "center", align: "start", components: [
				{name: "proxyPort", kind: "Input", value: "", pack: "center", align: "start", lazy: false, onchange: "checkPort"}
			]},

			{kind: "RowGroup", caption: "Proxy App", name: "squidLaunchGroup", components: [
				{kind: "Item", align: "center", tapHighlight: false, layoutKind: "HFlexLayout", components: [
					{flex: 1, content: $L("Squid SSL Bump")},
					{kind: "Button", caption: $L("Launch"), onclick: "launchSquid", style: "margin: -5px"}
				]}
			]},

			{name: "certOnDeviceNote", className: "footnote-text", content: "Use Nizovn's Squid SSL Bump app for webOS on your device. Make sure you Generate and Install Certificate and Start Squid in that app."},

			{kind: "RowGroup", caption: "Certificate", name: "certDownloadGroup", components: [
				{kind: "Item", align: "center", tapHighlight: false, layoutKind: "HFlexLayout", components: [
					{flex: 1, content: $L("Install Certificate")},
					{kind: "Button", name: "btnInstallCert", onclick: "downloadCert", style: "margin: -5px", components: [
						{kind: "enyo.Image", src: "images/InstallCert.png", alt: "Install", style: "margin: -5px"}
					]}
				]}
			]},

			{name: "certSelfHostNote", className: "footnote-text", content: "The squid-for-webos proxy provided by webOS Archive provides the cert at a well-known location. If you're self-hosting that proxy, enter the server address above, then tap Install Certificate to fetch and install it. See the Help menu for more information."},

			{name: "certManualNote", className: "footnote-text", content: "You will need to install your proxy server's certificate manually. Check your proxy server's documentation for instructions."},

			{kind: "RowGroup", caption: "Username", name: "usernameGroup", pack: "center", align: "start", components: [
				{name: "proxyUserName", kind: "Input", value: "", pack: "center", align: "start", lazy: false}
			]},

			{kind: "RowGroup", caption: "Password", name: "passwordGroup", pack: "center", align: "start", components: [
				{name: "proxyPassword", kind: "PasswordInput", value: "", pack: "center", align: "start", lazy: false}
			]},

		]},

		{
			kind: "Helpers.Updater",
			name: "myUpdater"
		},

		{kind: "AppMenu", components: [
			{caption: $L("About"), onclick: "showAbout"},
			{caption: $L("Reset"), onclick: "resetToDefaults"},
			{caption: $L("Help"), onclick: "showHelp"}
		]},
		{
			kind: "Dialog",
			name: "alert",
			lazy: false,
			components: [{
				layoutKind: "HFlexLayout",
				pack: "center",
				components: [
					{name: "alertMsg", kind: "HtmlContent", flex: 1, pack: "center", align: "start", style: "text-align: center;"}
				]
			}]
		},
		{
			kind: "DialogPrompt",
			name: "prompt",
			lazy: false,
			title: "Already Installed",
			message: "The certificate was previously installed. Do you want to launch the Certificates app to delete or manage the existing certificate?",
			acceptButtonCaption: "Yes",
			cancelButtonCaption: "No",
			onAccept: "manageCertificates"
		},
	],

	create: function() {
		this.inherited(arguments);
		this.handleLaunchParam();
		this.proxyOn = Prefs.getCookie("proxyState", this.proxyOn);
		this.proxyType = Prefs.getCookie("proxyType", this.proxyType);
		this.applySettings();
		this.$.proxyTypeGroup.setValue(this.proxyType);
		this.updateUIForType();
		this.setToggleProxy();

		if (!this.isTouchpad()) {
			this.$.spacerTP.hide();
			this.$.spacerPhone.show();
			this.$.headerIcon.addClass("smallIcon");
			this.$.tpmargin.hide();
			this.$.mainscroller.addClass("phone");
		} else {
			this.$.headerIcon.addClass("bigIcon");
			this.$.headerTitle.addClass("headerTitleTouchpad");
		}
		this.$.myUpdater.CheckForUpdate("webOS Archive Proxy");
	},

	handleActivate: function() {},
	handleDeactivate: function() {},

	handleLaunchParam: function() {
		enyo.log("ProxySet Launch params: " + JSON.stringify(enyo.windowParams));
	},

	showAbout: function() {
		var aboutMsg = "<div style='padding-bottom:12px;margin:auto 8px'>" + enyo.fetchAppInfo().title + " " + enyo.fetchAppInfo().version;
		if (enyo.fetchAppInfo().copyright)
			aboutMsg += " - " + enyo.fetchAppInfo().copyright;
		else
			aboutMsg += " by " + enyo.fetchAppInfo().vendor;
		if (enyo.fetchAppInfo().ossRepo)
			aboutMsg += ".<br>Source code and license available at:<br>" + enyo.fetchAppInfo().ossRepo;
		aboutMsg += "</div>";
		this.$.alertMsg.setContent(aboutMsg);
		this.$.alert.open();
	},

	showHelp: function() {
		this.$.launchAppRequest.call({"id": "com.palm.app.browser", "params": {"target": "http://www.webosarchive.org/proxy"}});
	},

	proxyTypeChanged: function() {
		if (this.proxyOn) {
			this.$.proxyTypeGroup.setValue(this.proxyType);
			return;
		}
		this.proxyType = this.$.proxyTypeGroup.getValue();
		Prefs.setCookie("proxyType", this.proxyType);
		this.updateUIForType();
	},

	updateUIForType: function() {
		// Squid launch button: on-device only
		if (this.proxyType === "ondevice") {
			this.$.squidLaunchGroup.show();
		} else {
			this.$.squidLaunchGroup.hide();
		}

		// Server: hidden for on-device (fixed at 127.0.0.1), visible for network and custom
		if (this.proxyType === "ondevice") {
			this.$.serverGroup.hide();
		} else {
			this.$.serverGroup.show();
		}

		// Port: visible for custom only (on-device and network are always 3128)
		if (this.proxyType === "custom") {
			this.$.portGroup.show();
		} else {
			this.$.portGroup.hide();
		}

		// Username/password: custom only
		if (this.proxyType === "custom") {
			this.$.usernameGroup.show();
			this.$.passwordGroup.show();
		} else {
			this.$.usernameGroup.hide();
			this.$.passwordGroup.hide();
		}

		this.updateCertUI();
	},

	updateCertUI: function() {
		this.$.certOnDeviceNote.hide();
		this.$.certDownloadGroup.hide();
		this.$.certSelfHostNote.hide();
		this.$.certManualNote.hide();

		if (this.proxyType === "ondevice") {
			this.$.certOnDeviceNote.show();
		} else if (this.proxyType === "network") {
			this.$.certDownloadGroup.show();
			this.$.certSelfHostNote.show();
		} else if (this.proxyType === "custom") {
			var server = this.$.proxyServer.getValue();
			if (server && server !== "" && server.toLowerCase().indexOf("webosarchive.org") !== -1) {
				this.$.certDownloadGroup.show();
			} else if (server && server !== "") {
				this.$.certManualNote.show();
			}
			// empty server: show nothing until the user enters an address
		}
	},

	serverChanged: function() {
		if (this.proxyType === "custom") {
			this.updateCertUI();
		}
	},

	setToggleProxy: function() {
		this.$.proxyToggleButton.show();
		this.$.proxyToggleButton.setState(this.proxyOn);
		this.toggleTextFields();
	},

	toggleTextFields: function() {
		var on = this.$.proxyToggleButton.getState();
		if (on) {
			this.$.proxyTypeBlocker.show();
		} else {
			this.$.proxyTypeBlocker.hide();
		}
		this.$.proxyServer.setDisabled(on);
		this.$.proxyPort.setDisabled(on);
		this.$.proxyUserName.setDisabled(on);
		this.$.proxyPassword.setDisabled(on);
	},

	checkServer: function() {
		var server = this.$.proxyServer.getValue();
		if (!server || server.length < 3) {
			this.$.alertMsg.setContent("Server must be at least 3 characters long!");
			this.$.alert.open();
			return false;
		}
		return true;
	},

	checkPort: function() {
		var port = parseInt(this.$.proxyPort.getValue(), 10);
		if (isNaN(port) || port < 1 || port > 65535) {
			this.$.alertMsg.setContent("Port must be a numerical value between 1 and 65535!");
			this.$.alert.open();
			return false;
		}
		return true;
	},

	handleProxyToggleChange: function(inSender, inState) {
		if (inState) {
			if (this.proxyType === "network" && this.$.proxyServer.getValue().toLowerCase().indexOf("webosarchive.org") !== -1) {
				enyo.log("Cancel turning proxy on: self-hosting not available on webosarchive.org");
				this.$.alertMsg.setContent("Self-hosting is not available on webosarchive.org");
				this.$.alert.open();
				this.proxyOn = false;
				this.setToggleProxy();
				return;
			}
			if (this.proxyType !== "ondevice" && !this.checkServer()) {
				enyo.log("Cancel turning proxy on: bad server");
				this.proxyOn = false;
				this.setToggleProxy();
				return;
			}
			if (this.proxyType === "custom" && !this.checkPort()) {
				enyo.log("Cancel turning proxy on: bad port");
				this.proxyOn = false;
				this.setToggleProxy();
				return;
			}
			enyo.log("Turn proxy on!");
			this.addSpecifiedProxies();
		} else {
			enyo.log("Turn proxy off!");
			this.removeAllProxies();
		}
		this.proxyOn = inState;
		Prefs.setCookie("proxyState", inState);
		this.toggleTextFields();
	},

	resetToDefaults: function() {
		this.proxyType = "ondevice";
		this.$.proxyTypeGroup.setValue(this.proxyType);
		this.$.proxyServer.setValue("");
		this.$.proxyPort.setValue(this.defaultPort);
		this.$.proxyUserName.setValue("");
		this.$.proxyPassword.setValue("");
		this.saveSettings();
		this.proxyOn = false;
		this.removeAllProxies();
		this.setToggleProxy();
		this.updateUIForType();
	},

	saveSettings: function() {
		Prefs.setCookie("proxyType", this.proxyType);
		Prefs.setCookie("server", this.$.proxyServer.getValue());
		Prefs.setCookie("port", this.$.proxyPort.getValue());
		Prefs.setCookie("username", this.$.proxyUserName.getValue());
		Prefs.setCookie("password", this.$.proxyPassword.getValue());
	},

	applySettings: function() {
		this.$.proxyServer.setValue(Prefs.getCookie("server", ""));
		this.$.proxyPort.setValue(Prefs.getCookie("port", this.defaultPort));
		this.$.proxyUserName.setValue(Prefs.getCookie("username", ""));
		this.$.proxyPassword.setValue(Prefs.getCookie("password", ""));
	},

	getEffectiveServer: function() {
		if (this.proxyType === "ondevice") return "127.0.0.1";
		return this.$.proxyServer.getValue();
	},

	getEffectivePort: function() {
		if (this.proxyType === "ondevice" || this.proxyType === "network") return 3128;
		return parseInt(this.$.proxyPort.getValue(), 10);
	},

	addSpecifiedProxies: function() {
		this.saveSettings();
		var server = this.getEffectiveServer();
		var port = this.getEffectivePort();
		var useServer = server;

		enyo.log("addSpecifiedProxies: type=" + this.proxyType + " server=" + server + " port=" + port);

		if (this.proxyType === "custom") {
			var username = this.$.proxyUserName.getValue();
			var password = this.$.proxyPassword.getValue();
			enyo.log("addSpecifiedProxies: username=" + username + " password length=" + (password ? password.length : 0));
			if (username && username !== "" && password && password !== "")
				useServer = username + ":" + password + "@" + server;
			else if (username && username !== "")
				useServer = username + "@" + server;
		}

		var proxyArgs = '{"action":"add","proxyInfo":{"proxyConfigType":"manualProxy","networkTechnology":"default","proxyScope":"default","isSecureProxy":true,"proxyPort":' + port + ',"proxyServer":"' + useServer + '"}}';
		enyo.log("On: configureNWProxiesCall.call(" + proxyArgs + ")");
		this.$.configureNwProxiesCall.call(proxyArgs);
	},

	removeAllProxies: function() {
		var proxyArgs = '{"action":"rmv","proxyInfo":{"proxyConfigType":"noProxy","proxyScope":"default"}}';
		enyo.log("Off: configureNWProxiesCall.call(" + proxyArgs + ")");
		this.$.configureNwProxiesCall.call(proxyArgs);
	},

	downloadCert: function() {
		var certUrl;
		if (this.proxyType === "network") {
			var server = this.$.proxyServer.getValue();
			if (!server || server.length < 3) {
				this.$.alertMsg.setContent("Please enter a server address before installing the certificate.");
				this.$.alert.open();
				return;
			}
			certUrl = "http://" + server + ":3129/localCert.der";
			this.activeCertLocalPath = this.certLocalPathNetwork;
		} else {
			certUrl = this.certRemotePath;
			this.activeCertLocalPath = this.certLocalPath;
		}
		enyo.log("** downloading cert from: " + certUrl);
		this.$.fileDownload.call({
			target: certUrl,
			mime: "application/x-x509-ca-cert",
			targetDir: "/media/internal/",
			targetFilename: this.activeCertLocalPath.split("/").pop(),
			keepFilenameOnRedirect: false,
			canHandlePause: false,
			subscribe: true
		});
	},

	downloadFinished: function(inSender, inResponse) {
		enyo.log("Download update, results=" + enyo.json.stringify(inResponse));
		if (!inResponse.completed) {
			return;
		}
		if (!inResponse.interrupted && !inResponse.aborted) {
			if (!inResponse.amountReceived || inResponse.amountReceived < 1) {
				enyo.error("Download completed but received 0 bytes");
				this.$.alertMsg.setContent("Certificate download failed: the server returned an empty response. Make sure the proxy server is running and reachable.");
				this.$.alert.open();
				return;
			}
			var localPath = inResponse.target || this.activeCertLocalPath;
			enyo.log("Installing cert from: " + localPath);
			this.$.alertMsg.setContent("Certificate downloaded!");
			this.$.alert.open();
			this.$.certInstallRequest.call({certificateFilename: localPath});
		}
	},

	downloadFail: function(inSender, inResponse) {
		enyo.log("Download failure, results=" + enyo.json.stringify(inResponse));
		this.$.alertMsg.setContent("Failed to download certificate! Make sure you're online and the proxy server is reachable.");
		this.$.alert.open();
	},

	certificateAddSuccess: function(inSender, inResponse) {
		this.$.alert.close();
		enyo.log("got success from add certificate...");
		enyo.log(inResponse);
		this.$.alertMsg.setContent("Certificate installed!");
		this.$.alert.open();
	},

	certificateAddFailure: function(inSender, inResponse) {
		this.$.alert.close();
		enyo.log("got failure from add certificate...");
		enyo.log(inResponse);
		if (inResponse.errorCode == 10) {
			this.$.prompt.open();
		} else {
			this.$.alertMsg.setContent("Failed to install certificate (" + inResponse.errorCode + ")");
			this.$.alert.open();
		}
	},

	manageCertificates: function() {
		this.$.launchAppRequest.call({id: "com.palm.app.certificate"});
	},

	certificateLaunchFailure: function() {
		this.$.alertMsg.setContent("There was an error launching the Certificates app. Go to the Device Info app, and choose Certificates from its menu.");
		this.$.alert.open();
	},

	launchSquid: function() {
		enyo.log("Launching com.nizovn.squid...");
		this.$.squidLaunchRequest.call({id: "com.nizovn.squid"});
	},

	squidLaunchSuccess: function(inSender, inResponse) {
		enyo.log("Squid launch success: " + enyo.json.stringify(inResponse));
	},

	squidLaunchFailure: function(inSender, inResponse) {
		enyo.log("Squid launch failure: " + enyo.json.stringify(inResponse));
		this.$.alertMsg.setContent("Squid SSL Bump does not appear to be installed.<br>See the Help menu for more info.");
		this.$.alert.open();
	},

	handleConnectionStatus: function(inSender, inResponse) {
		enyo.log("got response from connection manager...");
		enyo.log(inResponse);
		if (inResponse.returnValue) {
			if (this.proxyOn) {
				var typeLabels = {ondevice: "On-Device", network: "Self-Host", custom: "Custom"};
				enyo.windows.addBannerMessage("Proxy enabled: " + (typeLabels[this.proxyType] || this.proxyType), "{}");
			} else {
				enyo.windows.addBannerMessage("Proxy disabled", "{}");
			}
		}
	},

	isTouchpad: (function() {
		// TODO: we should use the cleaner Palm-approach here.
		var minSize = Math.min(window.innerWidth, window.innerHeight);
		var touchpad = true;
		if (minSize < 600) {
			// we're on a phone (even the Pre3 will be 480 here);
			var iconLocationPlus = "";
			touchpad = false;
		}
		return touchpad;
	})

});
