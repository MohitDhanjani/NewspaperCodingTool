"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const amazon_textract_response_parser_1 = require("amazon-textract-response-parser");
const NCTCredentials_1 = require("./NCTCredentials");
var newsID = document.getElementById('micon_save');
newsID.addEventListener('click', DoNewspaperAnalysis);
var OCRStates = {};
function testAnalysis() {
    console.log(via.d.store.metadata);
    for (var key in via.d.store.metadata) {
        console.log(key);
    }
}
function DoNewspaperAnalysis() {
    console.log(via);
    const lamUrl = NCTCredentials_1.credentials.lambda_url;
    if (lamUrl == '') {
        console.log('AWS Lambda Function URL missing. Please add in project settings.');
    }
    else {
        for (const key in via.d.file_ref) {
            if (key in OCRStates) {
                console.log('Using cached file.');
                processTextractResponse(key);
            }
            else {
                console.log('Connecting to AWS Textract.');
                (0, axios_1.default)({
                    method: "POST",
                    url: lamUrl,
                    data: via.d.file_ref["1"]
                }).then((response) => {
                    const layoutsFromTextract = new amazon_textract_response_parser_1.TextractDocument(response.data);
                    OCRStates[key] = layoutsFromTextract;
                    //console.log(layoutsFromTextract);
                    processTextractResponse(key);
                });
            }
        }
    }
}
function isPointInRectangle(px, py, rect) {
    const { x, y, width, height } = rect;
    return px >= x && px <= x + width && py >= y && py <= y + height;
}
function isPointInPolygon(px, py, polygon) {
    const numPoints = polygon.length / 2;
    let isInside = false;
    let j = numPoints - 1;
    for (let i = 0; i < numPoints; j = i++) {
        const xi = polygon[2 * i], yi = polygon[2 * i + 1];
        const xj = polygon[2 * j], yj = polygon[2 * j + 1];
        const intersect = ((yi > py) != (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi);
        if (intersect) {
            isInside = !isInside;
        }
    }
    return isInside;
}
function processTextractResponse(filename) {
    console.log('Processing Textract response.');
    const layoutsFromTextract = OCRStates[filename];
    var currentImg = document.getElementById('file_content');
    const pageHeight = currentImg.naturalHeight;
    const pageWidth = currentImg.naturalWidth;
    console.log(pageWidth + " " + pageHeight);
    console.log(via.va.vid);
    for (const page of layoutsFromTextract.iterPages()) {
        var regions = via.d.store.metadata;
        console.log(via.d.store.metadata);
        for (var key in via.d.store.metadata) {
            var currentMeta = via.d.store.metadata[key];
            if (currentMeta.xy.length >= 5) {
                console.log(currentMeta);
                var bodyAr = [];
                try {
                    for (const layItem of page.iterLines()) {
                        const boxX = Math.round(layItem.geometry.boundingBox.left * pageWidth);
                        const boxY = Math.round(layItem.geometry.boundingBox.top * pageHeight);
                        const boxH = Math.round(layItem.geometry.boundingBox.height * pageHeight);
                        const boxW = Math.round(layItem.geometry.boundingBox.width * pageWidth);
                        const boxBottomX = boxX + boxH;
                        const boxBottomY = boxY + boxH;
                        //How to entirely keep something in
                        if (currentMeta.xy[0] == 2) {
                            var shapeDetails = { x: currentMeta.xy[1], y: currentMeta.xy[2], height: currentMeta.xy[3], width: currentMeta.xy[4] };
                            if (isPointInRectangle(boxX, boxY, shapeDetails) && isPointInRectangle(boxBottomX, boxBottomY, shapeDetails)) {
                                bodyAr.push(layItem);
                            }
                        }
                        else if (currentMeta.xy[0] == 7) {
                            var shapeDetails = structuredClone(currentMeta.xy);
                            shapeDetails.shift();
                            if (isPointInPolygon(boxX, boxY, shapeDetails) && isPointInPolygon(boxBottomX, boxBottomY, shapeDetails)) {
                                bodyAr.push(layItem);
                            }
                        }
                    }
                }
                catch (err) {
                    console.log(err);
                }
                console.log(bodyAr);
                var sortedAr = bodyAr.sort((a, b) => {
                    return a.geometry.boundingBox.top > b.geometry.boundingBox.top;
                });
                console.log(sortedAr);
                var headlineAr = [];
                var headline = '';
                headlineAr.push(sortedAr[0].text);
                var headlineRaw = sortedAr[0];
                sortedAr.shift();
                for (let j = 0; j < 5; j++) {
                    if (areHeightsApproximatelyEqual(sortedAr[j].geometry.boundingBox.height, headlineRaw.geometry.boundingBox.height, 0.001)) {
                        headlineAr.push(sortedAr[j].text);
                        sortedAr.shift();
                    }
                    else if (!areHeightsApproximatelyEqual(sortedAr[j].geometry.boundingBox.height, sortedAr[j + 1].geometry.boundingBox.height, 0.001)) {
                        headlineAr.push(sortedAr[j].text);
                        sortedAr.shift();
                    }
                }
                headline = headlineAr.join(' ');
                var para = [];
                var fullBodyTextAr = [];
                sortedAr.forEach(element => {
                    if (!element.text.trim().endsWith('.')) {
                        para.push(element.text);
                    }
                    else {
                        para.push(element.text);
                        fullBodyTextAr.push(para.join(' '));
                        para = [];
                    }
                });
                var fullBodyText = fullBodyTextAr.join('\n');
                via.d.metadata_update_av(via.va.vid, key, 1, headline).then(() => {
                    console.log("Updated headline.");
                }).catch(() => {
                    console.log("Cannot update headline.");
                });
                via.d.metadata_update_av(via.va.vid, key, 3, fullBodyText).then(() => {
                    console.log("Updated body.");
                }).catch(() => {
                    console.log("Cannot update body.");
                });
            }
        }
        // if ( regions.length !==0 ) {
        //
        //     for ( var i = 0; i < regions.length; ++i ) {
        //         // var sattr = regions[i].shape_attributes;
        //         // var rattr = regions[i].region_attributes;
        //         // var shapeDetails = structuredClone(sattr);
        //         // delete shapeDetails.name;
        //
        //
        //         var bodyAr = [];
        //
        //         try {
        //
        //             for (const layItem of page.iterLines()) {
        //
        //                 const boxX = Math.round(layItem.geometry.boundingBox.left * pageWidth);
        //                 const boxY = Math.round(layItem.geometry.boundingBox.top * pageHeight);
        //                 const boxH = Math.round(layItem.geometry.boundingBox.height * pageHeight);
        //                 const boxW = Math.round(layItem.geometry.boundingBox.width * pageWidth);
        //
        //                 const boxBottomX = boxX + boxH;
        //                 const boxBottomY = boxY + boxH;
        //
        //                 //How to entirely keep something in
        //
        //                 if(sattr.name == "rect") {
        //                     if(isPointInRectangle(boxX, boxY, shapeDetails) && isPointInRectangle(boxBottomX, boxBottomY, shapeDetails)) {
        //                         bodyAr.push(layItem);
        //                     }
        //                 }
        //
        //                 if(sattr.name == "polygon") {
        //                     if(isPointInPolygon(boxX, boxY, shapeDetails) && isPointInPolygon(boxBottomX, boxBottomY, shapeDetails)) {
        //                         bodyAr.push(layItem);
        //                     }
        //                 }
        //             }
        //
        //
        //         } catch (err) {
        //             console.log(err);
        //         }
        //
        //         console.log(bodyAr);
        //
        //
        //
        //         var sortedAr = bodyAr.sort((a,b) => {
        //             return a.geometry.boundingBox.top > b.geometry.boundingBox.top;
        //         });
        //
        //         console.log(sortedAr);
        //
        //         var headlineAr = [];
        //         var headline = '';
        //         headlineAr.push(sortedAr[0].text);
        //         var headlineRaw = sortedAr[0];
        //         sortedAr.shift();
        //
        //         for (let j = 0; j < 5; j++) {
        //             if(areHeightsApproximatelyEqual(sortedAr[j].geometry.boundingBox.height, headlineRaw.geometry.boundingBox.height, 0.001)) {
        //                 headlineAr.push(sortedAr[j].text);
        //                 sortedAr.shift();
        //             } else if (!areHeightsApproximatelyEqual(sortedAr[j].geometry.boundingBox.height, sortedAr[j + 1].geometry.boundingBox.height, 0.001)) {
        //                 headlineAr.push(sortedAr[j].text);
        //                 sortedAr.shift();
        //             }
        //         }
        //
        //         headline = headlineAr.join(' ');
        //
        //         var para: string[] = [];
        //         var fullBodyTextAr: string[] = [];
        //         sortedAr.forEach(element => {
        //             if(!element.text.trim().endsWith('.')) {
        //                 para.push(element.text);
        //             } else {
        //                 para.push(element.text);
        //                 fullBodyTextAr.push(para.join(' '));
        //                 para = [];
        //             }
        //         });
        //
        //         var fullBodyText = fullBodyTextAr.join('\n');
        //
        //         var img_index = [_via_image_index];
        //
        //         try {
        //             nat_update_region_attribute(img_index, i, 'Headline', headline);
        //             nat_update_region_attribute(img_index, i, 'Body', fullBodyText);
        //         } catch(err) {
        //             show_message('Unable to add OCR information to region.');
        //             console.log(err);
        //         }
        //     }
        //
        // }
    }
}
function nat_update_region_attribute(imgIndex, regionID, attrToUpdate, newValue) {
    annotation_editor_update_region_metadata(imgIndex, regionID, attrToUpdate, newValue, undefined).then(function (update_count) {
        annotation_editor_on_metadata_update_done('region', attrToUpdate, update_count);
        annotation_editor_update_content();
    }, function (err) {
        console.log(err);
        show_message('Failed to update region attributes! ' + err);
    });
}
function areHeightsApproximatelyEqual(height1, height2, tolerance = 0.0001) {
    return Math.abs(height1 - height2) <= tolerance;
}
