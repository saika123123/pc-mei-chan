/** 
 * mmd.js: MMDAgentProxyのラッパー
 * パラメータ
 * proxy_addr: MMDAgentProxyServiceが動いているサーバのIPアドレス:ポート．デフォルトはlocalhost:8080
 * mmd_adr: MMDAgentProxyServiceが動いているサーバのIPアドレス:ポート．デフォルトはlocalhost:39390
 */
class MMD {
    constructor(proxy_addr = "localhost:8080", mmd_addr = "localhost:39390") {
        this.setProxyAddr(proxy_addr);
        this.setMMDAddr(mmd_addr);
        console.log("MMD created.")
    }

    /**
     *  MMDAgentProxyのアドレスを取得する
     */
    getProxyAddr() {
            return this.proxy_addr;
        }
        /**
         * 　MMDAgentのアドレスを取得する
         */
    getMMDAddr() {
            return this.mmd_addr;
        }
        /**
         * 　MMDAgentProxyのエンドポイントを取得する
         */
    getEndPoint() {
        const proxy_endpoint = "http://" + this.proxy_addr +
            "/axis2/services/MMDAgentProxyService";
        return proxy_endpoint;

    }

    /**
     * MMDAgentProxyのアドレスをセットする　（IPアドレス：ポート番号）
     * @param {*} proxy_addr 
     */
    setProxyAddr(proxy_addr) {
        this.proxy_addr = proxy_addr;
    }

    /**
     * MMDAgentのアドレスをMMDAgentProxyにセットする． (IPアドレス：ポート番号)
     * 
     * @param {*} mmd_addr 
     */
    setMMDAddr(mmd_addr) {
        let ip, port;
        [ip, port] = mmd_addr.split(":");

        this.mmd_addr = mmd_addr;
        let url = this.getEndPoint() + "/setIP?ip=" + ip;
        this.execWebAPI(url, function(mes) { $("#motion_result").val(mes) });
        url = this.getEndPoint() + "/setPortNumber?portNumber=" + port;
        this.execWebAPI(url, function(mes) { $("#motion_result").val(mes) });
    }

    //テキストを話す．非同期メソッド．
    speak(text) {
        const url = this.getEndPoint() + "/say?str=" + text;
        return this.execWebAPI(url);
    }

    //同期的にしゃべる
    speakSync(text) {
        const url = this.getEndPoint() + "/syncsay?str=" + text;
        return this.execWebAPI(url);
    }

    //モーション
    doMotion(motion) {
        const url = this.getEndPoint() + "/doMotion?motion=" + motion;
        this.stopMotion();
        return this.execWebAPI(url);
    }

    //モーション停止
    stopMotion(motion, clbk = null) {
        const url = this.getEndPoint() + "/stopMotion";
        return this.execWebAPI(url);
    }

    //API実行．fetchを使って

    /**
     * API実行．fetch()を利用して，Promise オブジェクトを返す
     * @param {}} url 
     * @param {*} clbk 
     */
    execWebAPI(url) {
        return fetch(url)
            .then(response => {
                //レスポンスコードをチェック
                if (response.status == 200) {
                    return response.text();
                } else {
                    throw new HttpError(response);
                }
            })
            .catch(err => console.log("Failed to fetch " + url, err));
    }
}

/**
 * HTTP エラークラス
 */
class HttpError extends Error {
    constructor(response) {
        super(`${response.status} for ${response.url}`);
        this.name = 'HttpError';
        this.response = response;
    }
}