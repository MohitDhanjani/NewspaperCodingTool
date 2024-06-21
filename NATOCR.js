"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const amazon_textract_response_parser_1 = require("amazon-textract-response-parser");
var newsID = document.getElementById('newsBtn');
newsID.addEventListener('click', DoNewspaperAnalysis);
var OCRStates = {};
function DoNewspaperAnalysis() {
    const lamUrl = _via_settings.nat.lambda_url;
    if (lamUrl == '') {
        show_message('AWS Lambda Function URL missing. Please add in project settings.');
    }
    else {
        for (const key in _via_img_fileref) {
            if (key in OCRStates) {
                show_message('Using cached file.');
                processTextractResponse(key);
            }
            else {
                show_message('Connecting to AWS Textract.');
                (0, axios_1.default)({
                    method: "POST",
                    url: lamUrl,
                    data: _via_img_fileref[key]
                }).then((response) => {
                    const layoutsFromTextract = new amazon_textract_response_parser_1.TextractDocument(response.data);
                    OCRStates[key] = layoutsFromTextract;
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
    const { all_points_x, all_points_y } = polygon;
    const numPoints = all_points_x.length;
    let isInside = false;
    let j = numPoints - 1;
    for (let i = 0; i < numPoints; j = i++) {
        const xi = all_points_x[i], yi = all_points_y[i];
        const xj = all_points_x[j], yj = all_points_y[j];
        const intersect = ((yi > py) != (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi);
        if (intersect) {
            isInside = !isInside;
        }
    }
    return isInside;
}
function processTextractResponse(filename) {
    show_message('Processing Textract response.');
    const layoutsFromTextract = OCRStates[filename];
    for (const page of layoutsFromTextract.iterPages()) {
        const pageHeight = _via_current_image_height;
        const pageWidth = _via_current_image_width;
        var regions = _via_img_metadata[_via_image_id].regions;
        console.log(regions);
        if (regions.length !== 0) {
            for (var i = 0; i < regions.length; ++i) {
                var sattr = regions[i].shape_attributes;
                var rattr = regions[i].region_attributes;
                var shapeDetails = structuredClone(sattr);
                delete shapeDetails.name;
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
                        if (sattr.name == "rect") {
                            if (isPointInRectangle(boxX, boxY, shapeDetails) && isPointInRectangle(boxBottomX, boxBottomY, shapeDetails)) {
                                bodyAr.push(layItem);
                            }
                        }
                        if (sattr.name == "polygon") {
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
                var img_index = [_via_image_index];
                try {
                    nat_update_region_attribute(img_index, i, 'Headline', headline);
                    nat_update_region_attribute(img_index, i, 'Body', fullBodyText);
                }
                catch (err) {
                    show_message('Unable to add OCR information to region.');
                    console.log(err);
                }
            }
        }
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
