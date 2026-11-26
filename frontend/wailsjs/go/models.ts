export namespace config {
	
	export enum RoutingMode {
	    BLOCKLIST = "blocklist",
	    ALLOWLIST = "allowlist",
	}
	export enum UpdatePolicyType {
	    AUTOMATIC = "automatic",
	    PROMPT = "prompt",
	    DISABLED = "disabled",
	}
	export class FilterList {
	    name: string;
	    type: string;
	    url: string;
	    enabled: boolean;
	    trusted: boolean;
	    locales: string[];
	
	    static createFrom(source: any = {}) {
	        return new FilterList(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.type = source["type"];
	        this.url = source["url"];
	        this.enabled = source["enabled"];
	        this.trusted = source["trusted"];
	        this.locales = source["locales"];
	    }
	}
	export class RoutingConfig {
	    mode: RoutingMode;
	    appPaths: string[];
	
	    static createFrom(source: any = {}) {
	        return new RoutingConfig(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.mode = source["mode"];
	        this.appPaths = source["appPaths"];
	    }
	}

}

export namespace options {
	
	export class SecondInstanceData {
	    Args: string[];
	    WorkingDirectory: string;
	
	    static createFrom(source: any = {}) {
	        return new SecondInstanceData(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.Args = source["Args"];
	        this.WorkingDirectory = source["WorkingDirectory"];
	    }
	}

}

export namespace vpn {
	
	export class Status {
	    state: string;
	    message: string;
	
	    static createFrom(source: any = {}) {
	        return new Status(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.state = source["state"];
	        this.message = source["message"];
	    }
	}
	export class ConnectionInfo {
	    serverHostName: string;
	    serverIP: string;
	    countryLong: string;
	    countryShort: string;
	    engine: string;
	    status: Status;
	    killSwitchOn: boolean;
	    dnsProtectionOn: boolean;
	
	    static createFrom(source: any = {}) {
	        return new ConnectionInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.serverHostName = source["serverHostName"];
	        this.serverIP = source["serverIP"];
	        this.countryLong = source["countryLong"];
	        this.countryShort = source["countryShort"];
	        this.engine = source["engine"];
	        this.status = this.convertValues(source["status"], Status);
	        this.killSwitchOn = source["killSwitchOn"];
	        this.dnsProtectionOn = source["dnsProtectionOn"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class EngineAvailability {
	    engine: string;
	    ready: boolean;
	    message: string;
	
	    static createFrom(source: any = {}) {
	        return new EngineAvailability(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.engine = source["engine"];
	        this.ready = source["ready"];
	        this.message = source["message"];
	    }
	}
	export class SoftEtherOwnership {
	    service: string;
	    serviceOwned: boolean;
	    serviceBinaryPath?: string;
	    adapter: string;
	    adapterOwned: boolean;
	    account: string;
	    runtimeDir?: string;
	    manifestHash?: string;
	    updatedAt?: string;
	
	    static createFrom(source: any = {}) {
	        return new SoftEtherOwnership(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.service = source["service"];
	        this.serviceOwned = source["serviceOwned"];
	        this.serviceBinaryPath = source["serviceBinaryPath"];
	        this.adapter = source["adapter"];
	        this.adapterOwned = source["adapterOwned"];
	        this.account = source["account"];
	        this.runtimeDir = source["runtimeDir"];
	        this.manifestHash = source["manifestHash"];
	        this.updatedAt = source["updatedAt"];
	    }
	}

}

export namespace vpngate {
	
	export class Server {
	    hostName: string;
	    ip: string;
	    score: number;
	    ping: number;
	    speed: number;
	    countryLong: string;
	    countryShort: string;
	    numVpnSessions: number;
	    uptime: number;
	    totalUsers: number;
	    totalTraffic: number;
	    logType: string;
	    operator: string;
	    message: string;
	    openVpnConfigBase64: string;
	    computedScore: number;
	
	    static createFrom(source: any = {}) {
	        return new Server(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.hostName = source["hostName"];
	        this.ip = source["ip"];
	        this.score = source["score"];
	        this.ping = source["ping"];
	        this.speed = source["speed"];
	        this.countryLong = source["countryLong"];
	        this.countryShort = source["countryShort"];
	        this.numVpnSessions = source["numVpnSessions"];
	        this.uptime = source["uptime"];
	        this.totalUsers = source["totalUsers"];
	        this.totalTraffic = source["totalTraffic"];
	        this.logType = source["logType"];
	        this.operator = source["operator"];
	        this.message = source["message"];
	        this.openVpnConfigBase64 = source["openVpnConfigBase64"];
	        this.computedScore = source["computedScore"];
	    }
	}

}

