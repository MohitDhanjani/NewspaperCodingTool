import axios, {head} from 'axios';

import {ApiAnalyzeDocumentResponse, TextractDocument,} from "amazon-textract-response-parser";

var newsID = document.getElementById('newsBtn');
newsID.addEventListener('click', DoNewspaperAnalysis);

var OCRStates: any = {};


function DoNewspaperAnalysis() {

    const lamUrl = _via_settings.nat.lambda_url;

    const currentImageID = _via_image_id;

    if(lamUrl == '') {
        show_message('AWS Lambda Function URL missing. Please add in project settings.');
    } else {

        if(currentImageID in OCRStates) {
            show_message('Using cached file.');
            processTextractResponse(currentImageID);
        }
        else {

            show_message('Connecting to AWS Textract.');
            axios({
                method: "POST",
                url: lamUrl,
                headers: {
                    'x-nat-apikey': _via_settings.nat.lambda_api_key
                },
                data: _via_img_fileref[currentImageID]
            }).then((response) => {
                const layoutsFromTextract = new TextractDocument((response.data as unknown) as ApiAnalyzeDocumentResponse);

                OCRStates[currentImageID] = layoutsFromTextract;
                processTextractResponse(currentImageID);
            });
        }
    }
}

function processTextractResponse(filename) {

    show_message('Processing Textract response.');

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

                if(rattr.Type == "Headline" || rattr.Type == "Body" || rattr.Type == "Byline") {

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

                                if(nat_is_inside_this_region(boxX, boxY, i) && nat_is_inside_this_region(boxBottomX, boxBottomY, i)) {
                                    layItem.computedX = boxX;
                                    bodyAr.push(layItem);
                                }

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

            for ( var g = 0; g < regions.length; ++g ) {

                var ParentSattr = regions[g].shape_attributes;
                var ParentRattr = regions[g].region_attributes;
                var ParentShapeDetails = structuredClone(ParentSattr);
                delete ParentShapeDetails.name;

                if(ParentRattr.Type == "Article") {

                    var childObjects = [];

                    for ( var j = 0; j < regions.length; ++j ) {

                        console.log(regions[j]);

                        var ChildSattr = regions[j].shape_attributes;
                        var ChildRattr = regions[j].region_attributes;
                        var ChildShapeDetails = structuredClone(regions[j].shape_attributes);
                        delete ChildShapeDetails.name;

                        if (ChildRattr.Type == "Body" || ChildRattr.Type == "Headline" || ChildRattr.Type == "Byline") {

                            if(nat_is_inside_this_region(ChildSattr.x, ChildSattr.y, g)) {
                                childObjects.push(regions[j]);
                            }

                        }

                        console.log('Below are child objects of article region ' + g);
                        console.log(childObjects);

                        let headlineObject = childObjects.find(item => item.region_attributes.Type === "Headline");
                        let headlineText = headlineObject ? headlineObject.region_attributes.Text : 'NA';

                        let bylineObject = childObjects.find(item => item.region_attributes.Type === "Byline");
                        let bylineText = bylineObject ? bylineObject.region_attributes.Text : 'NA';

                        let bodyObjects = childObjects.filter(item => item.region_attributes.Type === "Body");

                        bodyObjects.sort((a, b) => a.shape_attributes.x - b.shape_attributes.x);

                        let bodyTexts = bodyObjects.map(item => item.region_attributes.Text);

                        var combinedText = [];

                        combinedText[0] = 'HEADLINE: ' + headlineText;
                        combinedText[1] = '';
                        combinedText[2] = 'BYLINE: ' + bylineText;
                        combinedText[3] = '';

                        var stringText = [...combinedText, ...bodyTexts].join('\n');

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

    }

}

function nat_update_region_attribute(imgID, regionID, attrToUpdate, newValue) {

    _via_img_metadata[imgID].regions[regionID].region_attributes[attrToUpdate] = newValue;
    annotation_editor_on_metadata_update_done('region', attrToUpdate, 1);
    annotation_editor_update_content();
}