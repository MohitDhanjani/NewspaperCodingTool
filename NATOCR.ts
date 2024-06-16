import axios  from 'axios';
import {
    ApiAnalyzeDocumentResponse,
    TextractDocument,
} from "amazon-textract-response-parser";

var newsID = document.getElementById('newsBtn');
newsID.addEventListener('click', DoNewspaperAnalysis);

function DoNewspaperAnalysis() {

    const lamUrl = '';

    for( const key in _via_img_fileref) {
        axios({
            method: "POST",
            url: lamUrl,
            data: _via_img_fileref[key]
        }).then((response) => {
            const layoutsFromTextract = new TextractDocument((response.data as unknown) as ApiAnalyzeDocumentResponse);
            console.log(layoutsFromTextract);

            for (const page of layoutsFromTextract.iterPages()) {
                const pageHeight = _via_current_image_height;
                const pageWidth = _via_current_image_width;

                var regions = _via_img_metadata[_via_image_id].regions;

                console.log(regions);

                if ( regions.length !==0 ) {

                    for ( var i = 0; i < regions.length; ++i ) {
                        var sattr = regions[i].shape_attributes;
                        var shapeDetails = structuredClone(sattr);
                        delete shapeDetails.name;


                        var bodyAr = [];
                        var headline = '';

                        page.layout.listItems().forEach((layItem) => {

                            const boxX = Math.round(layItem.geometry.boundingBox.left * pageWidth);
                            const boxY = Math.round(layItem.geometry.boundingBox.top * pageHeight);
                            const boxH = layItem.geometry.boundingBox.height * pageHeight;
                            const boxW = layItem.geometry.boundingBox.width * pageWidth;

                            if(sattr.name == "rect") {
                                if(isPointInRectangle(boxX, boxY, shapeDetails)) {
                                    bodyAr.push(layItem);
                                }
                            }

                            if(sattr.name == "polygon") {
                                if(isPointInPolygon(boxX, boxY, shapeDetails)) {
                                    bodyAr.push(layItem);
                                }
                            }


                        });

                        var sortedAr = bodyAr.sort((a,b) => {
                            return a.geometry.boundingBox.top > b.geometry.boundingBox.top;
                        });

                        headline = sortedAr[0].text;
                        sortedAr.shift();

                        var fullBodyTextAr: string[] = [];
                        sortedAr.forEach(element => {
                            fullBodyTextAr.push(element.text);
                        });

                        var fullBodyText = fullBodyTextAr.join("\n\n");

                        var img_index = [_via_image_index];

                        nat_update_region_attribute(img_index, i, 'Headline', headline);
                        nat_update_region_attribute(img_index, i, 'Body', fullBodyText);

                    }

                }


            }

        });
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

function nat_update_region_attribute(imgIndex, regionID, attrToUpdate, newValue) {

    annotation_editor_update_region_metadata(imgIndex, regionID, attrToUpdate, newValue, undefined).then( function(update_count) {
        annotation_editor_on_metadata_update_done('region', attrToUpdate, update_count);
        annotation_editor_update_content();
    }, function(err) {
        console.log(err)
        show_message('Failed to update region attributes! ' + err);
    });
}