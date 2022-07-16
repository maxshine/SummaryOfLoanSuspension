import axios from "axios";
import path from "path";
import {
    DATA_GENERATED_DIR,
    DATA_VISUALIZATION_PATH,
    FRONTEND_REACT_SRC_DIR,
} from "../const";
import {encodeFeaturesFromFileToArray} from "./encodeFeatures";
import * as fs from "fs";
import {createWriteStream} from "fs";
import {genCircleDraw, genCirclePoints} from "./genCirclePoints";
import {AddressWithCount} from "../../frontend/react/src/ds";
import {Lang} from "./ds";
import {GOOGLE_MAP_API_KEY} from "../../frontend/react/src/const";

// https://stackoverflow.com/a/51727245/9422455
require('axios-debug-log')



/**
 * ref: https://developers.google.com/maps/documentation/maps-static/start
 */
export interface IGenMap {
    key?: string
    /**
     * max-size: 640x640, the longer side would be limited
     *   if we wanner bigger image, we can combine it with scale to be 2
     * sample: 512x512
     */
    language?: Lang
    region?: string // https://developers.google.com/maps/coverage
    size?: string
    /**
     * the final output dimension is from `size x scale`
     * default: 1
     */
    scale?: number
    zoom?: number // 12
    center?: string // "Chicago"，应该也可以是经纬度
    format?: string // png
    styles?: string[]
    path?: string[]
}

export function paramsSerializer(params: Record<string, string | string[]>): string {
    let frags: string[] = []
    Object.entries(params).forEach(([key, val]) => {
        if (!Array.isArray(val)) {
            frags.push(key + "=" + val)
        } else if (val.length) {
            val.forEach(v => {
                frags.push(key + "=" + v)
            })
        }
    })
    return frags.join("&")
}

export function genMap(props: IGenMap) {
    const format = props.format || "png"
    axios.get(
        "https://maps.googleapis.com/maps/api/staticmap",
        {
            params: {
                key: props.key || GOOGLE_MAP_API_KEY,
                language: props.language || "zh",
                region: props.region || "CN",
                size: props.size || "640x640",
                zoom: props.zoom || 5,
                center: props.center || "BeiJing",
                format,
                style: props.styles || [],
                path: props.path || []
            },
            // 定制自己的serializer，因为style键会重复，但是不能直接用qs.stringify，会转义，google不允许转义，否则style无效
            paramsSerializer,
            // ref: https://stackoverflow.com/a/66204076/9422455
            responseType: "stream"
        }
    )
        .then(res => {
            const fp = path.join(DATA_GENERATED_DIR, "visualization." + format)
            // write image from axios response, ref: https://stackoverflow.com/a/61269447/9422455
            const writer = createWriteStream(fp);
            res.data.pipe(writer)
            console.log("wrote image to file://" + fp)
        })
        .catch(err => {
            console.error({err})
        })
}


const styles = encodeFeaturesFromFileToArray(path.join(FRONTEND_REACT_SRC_DIR, "components/google/theme-dark-simple-2.json"))
const cities: AddressWithCount[] = JSON.parse(fs.readFileSync(DATA_VISUALIZATION_PATH, "utf-8"))
const circles = Object.values(cities).map(item => genCircleDraw(genCirclePoints(item.pos.lat, item.pos.lng, 50 * Math.log10(item.count + 1), 10), true))

genMap({
    language: "zh",
    region: "US",
    center: '33,113', // 比较合适的地图中心位置
    zoom: 5,            // 比较合适的放缩级别（正好显示整个中国）
    size: "640x640",
    scale: 2,
    styles,
    path: circles,
})