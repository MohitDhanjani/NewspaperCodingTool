import axios, {head} from 'axios';

import {ApiAnalyzeDocumentResponse, TextractDocument,} from "amazon-textract-response-parser";

var ocrBridge = document.getElementById('ocrBridge');
ocrBridge.addEventListener('click', DoNewspaperAnalysis);

var generateTextBridge = document.getElementById('generateTextBridge');
generateTextBridge.addEventListener('click', processText);

var ocrMenuItem = document.getElementById('ocrMenuItem');
var formerItemString = ocrMenuItem.innerText;

var OCRStates: any = {};


function DoNewspaperAnalysis() {


    // ocrMenuItem.innerHTML = 'Processing...';
    // ocrBridge.disabled = true;

    const lamUrl = _via_settings.nat.lambda_url;

    const currentImageID = _via_image_id;

    if(lamUrl == '') {
        show_message('AWS Lambda Function URL missing. Please add in project settings.');
        ocrBridge.disabled = false;
        ocrMenuItem.innerHTML = formerItemString;
    } else {

        if(currentImageID in OCRStates) {
            show_message('Using cached file.');
            processTextractResponse(currentImageID);
        }
        else {

            show_message('Connecting to AWS Textract.', -1);
            axios({
                method: "POST",
                url: lamUrl,
                headers: {
                    'x-nat-apikey': _via_settings.nat.lambda_api_key
                },
                data: _via_img_fileref[currentImageID]
            }).then((response) => {
                show_message('Response received from AWS Textract.', -1);
                const layoutsFromTextract = new TextractDocument((response.data as unknown) as ApiAnalyzeDocumentResponse);
                show_message('Adding response to cache.', -1);
                OCRStates[currentImageID] = layoutsFromTextract;
                processTextractResponse(currentImageID);
            }).catch((err) => {
                show_message('Unable to connect to AWS Textract.');
                ocrBridge.disabled = false;
                ocrMenuItem.innerHTML = formerItemString;
            });
        }
    }
}

function processTextractResponse(filename) {

    show_message('Processing Textract response.', -1);

    const layoutsFromTextract  = OCRStates[filename];

    const pageHeight = _via_current_image_height;
    const pageWidth = _via_current_image_width;

    var regions = _via_img_metadata[_via_image_id].regions;

    for (const page of layoutsFromTextract.iterPages()) {

        if ( regions.length !==0 ) {

            for ( var i = 0; i < regions.length; ++i ) {

                var sattr = regions[i].shape_attributes;
                var rattr = regions[i].region_attributes;
                var shapeDetails = structuredClone(sattr);
                delete shapeDetails.name;

                if(['Headline', 'Body', 'Byline', 'Lead'].includes(rattr.Type) && rattr['Freeze Text'] != 'Yes') {

                    var bodyAr = [];

                    try {

                        for (const layLines of page.iterLines()) {

                            for(const layItem of layLines.iterWords()) {

                                const boxX = Math.round(layItem.geometry.boundingBox.left * pageWidth);
                                const boxY = Math.round(layItem.geometry.boundingBox.top * pageHeight);
                                const boxH = Math.round(layItem.geometry.boundingBox.height * pageHeight);
                                const boxW = Math.round(layItem.geometry.boundingBox.width * pageWidth);

                                const boxBottomX = boxX + boxW;
                                const boxBottomY = boxY + boxH;

                                let boxDimensions = { x: boxX, y: boxY, height: boxH, width: boxW }

                                if(sattr.name == "rect" && isMostOfBoxAUnderBoxB(boxDimensions,sattr)) {
                                    layItem.computedX = boxX;
                                    bodyAr.push(layItem);
                                }

                                if(sattr.name == "polygon" && isMostOfBoxInPolygon(boxDimensions, sattr)) {
                                    layItem.computedX = boxX;
                                    bodyAr.push(layItem);
                                }

                                // if(nat_is_inside_this_region(boxX, boxY, i) && nat_is_inside_this_region(boxBottomX, boxBottomY, i)) {
                                //     layItem.computedX = boxX;
                                //     bodyAr.push(layItem);
                                // }

                            }
                        }


                    } catch (err) {
                        console.log(err);
                    }

                    var fullBodyTextAr: string[] = [];
                    bodyAr.forEach(element => {
                        fullBodyTextAr.push(element.text);
                    });

                    try {
                        nat_update_region_attribute(_via_image_id, i, 'Text', fullBodyTextAr.join(' '));
                    } catch(err) {
                        show_message('Unable to add OCR information to region.');
                        console.log(err);
                        
                    }

                }
            }

            processText();

        }

    }

    show_message('Textract Processing Done.');

}

function processText() {

    var region_id = -1;

    console.log('The region ID is ' + region_id)

    var regions = _via_img_metadata[_via_image_id].regions;

    if ( regions.length !==0 ) {

        var loopRunTimes = region_id == -1 ? regions.length : region_id + 1;
        var loopStartNumber = region_id == -1 ? 0 : region_id;

        for ( var g = 0; g < regions.length; ++g ) {

            var ParentSattr = regions[g].shape_attributes;
            var ParentRattr = regions[g].region_attributes;
            var ParentShapeDetails = structuredClone(ParentSattr);
            delete ParentShapeDetails.name;

            if(['Article', 'Item'].includes(ParentRattr.Type) && ParentRattr['Freeze Text'] != 'Yes') {

                var childObjects = [];

                for ( var j = 0; j < regions.length; ++j ) {

                    console.log(regions[j]);

                    var ChildSattr = regions[j].shape_attributes;
                    var ChildRattr = regions[j].region_attributes;
                    var ChildShapeDetails = structuredClone(regions[j].shape_attributes);
                    delete ChildShapeDetails.name;

                    if (ChildRattr.Type == "Body" || ChildRattr.Type == "Headline" || ChildRattr.Type == "Byline" || ChildRattr.Type == "Lead") {

                        if(isShapeMostlyContained(ChildSattr, ParentSattr)) {
                            childObjects.push(regions[j]);
                        }

                        // if(nat_is_inside_this_region(ChildSattr.x, ChildSattr.y, g)) {
                        //     childObjects.push(regions[j]);
                        // }

                    }

                    console.log('Below are child objects of article region ' + g);
                    console.log(childObjects);

                    let headlineObject = childObjects.find(item => item.region_attributes.Type === "Headline");
                    let headlineText = headlineObject ? headlineObject.region_attributes.Text : 'NA';

                    let bylineObject = childObjects.find(item => item.region_attributes.Type === "Byline");
                    let bylineText = bylineObject ? bylineObject.region_attributes.Text : 'NA';

                    let leadObject = childObjects.find(item => item.region_attributes.Type === "Lead");
                    let leadText = leadObject ? leadObject.region_attributes.Text : 'NA';

                    let bodyObjects = childObjects.filter(item => item.region_attributes.Type === "Body");

                    bodyObjects.sort((a, b) => a.shape_attributes.x - b.shape_attributes.x);

                    let bodyTexts = bodyObjects.map(item => item.region_attributes.Text);

                    var combinedText = [];

                    if(ParentRattr.Type == "Item") {
                        combinedText[0] = headlineText == 'NA' ?  '' : headlineText;
                        combinedText[1] = bylineText == 'NA' ?  '' : bylineText;
                        combinedText[2] = leadText == 'NA' ?  '' : leadText;;
                    } else {
                        combinedText[0] = 'HEADLINE: ' + headlineText;
                        combinedText[1] = '';
                        combinedText[2] = 'BYLINE: ' + bylineText;
                        combinedText[3] = '';
                        combinedText[4] = leadText == 'NA' ?  '' : leadText;
                    }

                    var stringText = [...combinedText, ...bodyTexts].join('\n');

                    stringText = stringText.replace(new RegExp('(\w*)- (\w*)', 'g'), '');

                    console.log(stringText);

                    try {
                        nat_update_region_attribute(_via_image_id, g, 'Text', stringText);
                    } catch (err) {
                        show_message('Unable to add OCR information to region.');
                        console.log(err);
                        
                    }

                }

            }


        }

    }

    show_message('OCR Processing Done.');


}

function nat_update_region_attribute(imgID, regionID, attrToUpdate, newValue) {

    _via_img_metadata[imgID].regions[regionID].region_attributes[attrToUpdate] = newValue;
    annotation_editor_on_metadata_update_done('region', attrToUpdate, 1);
    annotation_editor_update_content();
}

function isMostOfBoxAUnderBoxB(boxA, boxB) {
    // Extract the coordinates and dimensions of Box A
    const xA = boxA.x;
    const yA = boxA.y;
    const widthA = boxA.width;
    const heightA = boxA.height;

    // Extract the coordinates and dimensions of Box B
    const xB = boxB.x;
    const yB = boxB.y;
    const widthB = boxB.width;
    const heightB = boxB.height;

    // Calculate the area of Box A
    const areaA = widthA * heightA;

    // Calculate the coordinates of the intersection rectangle
    const xIntersection = Math.max(xA, xB);
    const yIntersection = Math.max(yA, yB);
    const widthIntersection = Math.min(xA + widthA, xB + widthB) - xIntersection;
    const heightIntersection = Math.min(yA + heightA, yB + heightB) - yIntersection;

    // Check if there is an intersection
    if (widthIntersection > 0 && heightIntersection > 0) {
        // Calculate the area of the intersection
        const areaIntersection = widthIntersection * heightIntersection;

        // Check if the area of the intersection is more than half the area of Box A
        return areaIntersection > (areaA / 2);
    } else {
        // No intersection
        return false;
    }
}

function isMostOfBoxInPolygon(box, polygon, resolution = 10) {
    const xStart = box.x;
    const yStart = box.y;
    const width = box.width;
    const height = box.height;

    let insideCount = 0;
    const totalPoints = resolution * resolution;

    // Iterate over the grid points within the bounding box
    for (let i = 0; i < resolution; i++) {
        for (let j = 0; j < resolution; j++) {
            const x = xStart + (i / (resolution - 1)) * width;
            const y = yStart + (j / (resolution - 1)) * height;
            if (isPointInPolygon(x, y, polygon)) {
                insideCount++;
            }
        }
    }

    // Check if more than half of the points are inside the polygon
    return insideCount / totalPoints > 0.5;
}

// Helper function to check if a point is inside a polygon using the ray-casting algorithm
function isPointInPolygon(x, y, polygon) {
    let inside = false;
    const { all_points_x, all_points_y } = polygon;
    const n = all_points_x.length;

    for (let i = 0, j = n - 1; i < n; j = i++) {
        const xi = all_points_x[i], yi = all_points_y[i];
        const xj = all_points_x[j], yj = all_points_y[j];

        const intersect = ((yi > y) !== (yj > y)) &&
            (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }

    return inside;
}

// Helper function to check if a point is inside a rectangle (bounding box)
function isPointInBox(x, y, box) {
    return (x >= box.x && x <= box.x + box.width && y >= box.y && y <= box.y + box.height);
}

// Helper function to calculate the area of a polygon using the Shoelace theorem
function polygonArea(polygon) {
    const { all_points_x, all_points_y } = polygon;
    const n = all_points_x.length;
    let area = 0;
    for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        area += all_points_x[i] * all_points_y[j];
        area -= all_points_y[i] * all_points_x[j];
    }
    area = Math.abs(area) / 2;
    return area;
}

// Helper function to calculate the area of a rectangle
function boxArea(box) {
    return box.width * box.height;
}

// Main function to check if the first shape is mostly contained within the second shape
function isShapeMostlyContained(shapeA, shapeB, resolution = 10) {
    let insideCount = 0;
    let totalPoints = 0;
    let areaA;

    if (shapeA.all_points_x) {
        // Shape A is a polygon
        areaA = polygonArea(shapeA);
        const { all_points_x, all_points_y } = shapeA;
        const xMin = Math.min(...all_points_x);
        const xMax = Math.max(...all_points_x);
        const yMin = Math.min(...all_points_y);
        const yMax = Math.max(...all_points_y);

        for (let i = 0; i < resolution; i++) {
            for (let j = 0; j < resolution; j++) {
                const x = xMin + (i / (resolution - 1)) * (xMax - xMin);
                const y = yMin + (j / (resolution - 1)) * (yMax - yMin);
                if (isPointInPolygon(x, y, shapeA)) {
                    totalPoints++;
                    if (shapeB.all_points_x ? isPointInPolygon(x, y, shapeB) : isPointInBox(x, y, shapeB)) {
                        insideCount++;
                    }
                }
            }
        }
    } else {
        // Shape A is a rectangle (bounding box)
        areaA = boxArea(shapeA);
        const xStart = shapeA.x;
        const yStart = shapeA.y;
        const width = shapeA.width;
        const height = shapeA.height;

        for (let i = 0; i < resolution; i++) {
            for (let j = 0; j < resolution; j++) {
                const x = xStart + (i / (resolution - 1)) * width;
                const y = yStart + (j / (resolution - 1)) * height;
                totalPoints++;
                if (shapeB.all_points_x ? isPointInPolygon(x, y, shapeB) : isPointInBox(x, y, shapeB)) {
                    insideCount++;
                }
            }
        }
    }

    return (insideCount / totalPoints) > 0.5;
}