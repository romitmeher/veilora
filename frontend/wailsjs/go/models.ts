export namespace config {
        
        export enum UpdatePolicyType {
            AUTOMATIC = "automatic",
            PROMPT = "prompt",
            DISABLED = "disabled",
        }
        export enum RoutingMode {
            BLOCKLIST = "blocklist",
            ALLOWLIST = "allowlist",
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
        computedScore: number;
        openVpnConfigBase64: string;

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
            this.computedScore = source["computedScore"];
            this.openVpnConfigBase64 = source["openVpnConfigBase64"];
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
            this.status = source["status"];
            this.killSwitchOn = source["killSwitchOn"];
            this.dnsProtectionOn = source["dnsProtectionOn"];
        }
    }

}

