import React, { Component } from 'react';

const Suggestor = () => {
    var defensiveCR;
    var offensiveCR;
    var totalCR;

    var HP;
    var AC;
    var AB;
    var DPR;
    var monsterFeats = {};
    var encounterSize = 0;

    //Party Info
    var partySize = 0;

    var editing = false;
    var editingMonster = 0;

    

    const displayDPRDice = (panel) => {
        if (panel.style.display == 'block') panel.style.display = 'none';
        else panel.style.display = 'block';
    }

    const getDPRDiceText = (DPR, modifier) => {
        var output =
            "<span style='font: small-caps 700 1.2em Libre Baskerville; color: rgb(100, 0, 0); text-align: center;'>Damage Dice</span><br/>";
    
        output +=
            "<span style='font: bold 1em Noto Sans;'>Single Attack</span><br/>";
        output += getDPRDiceCodes(DPR, modifier) + '<br/><br/>';
    
        output +=
            "<span style='font: bold 1em Noto Sans;'>Multiattack x2</span><br/>";
        output += getDPRDiceCodes(DPR * 0.6, modifier) + '<br/>';
        output += getDPRDiceCodes(DPR * 0.4, modifier) + '<br/><br/>';
    
        output +=
            "<span style='font: bold 1em Noto Sans;'>Multiattack x3</span><br/>";
        output += getDPRDiceCodes(DPR * 0.45, modifier) + '<br/>';
        output += getDPRDiceCodes(DPR * 0.3, modifier) + '<br/>';
        output += getDPRDiceCodes(DPR * 0.25, modifier);
    
        return output;
    }
    
    const getDPRDiceCodes = (DPR, modifier) => {
        DPR = Math.round(DPR);
        var diceTypes = [4, 6, 8, 10, 12]; // Available dice types, including d4
        var output = "<span style='font: .8em Noto Sans;'>" + DPR + ' (';
    
        var diceAvg = DPR - modifier;
        
        // Loop through available dice types
        for (var i = 0; i < diceTypes.length; i++) {
            var diceType = diceTypes[i];
            var numDice = Math.max(1, Math.round(diceAvg / diceType)); // Calculate number of dice
            
            if (numDice > 0) {
                output += numDice + 'd' + diceType; // Add dice code to output
                modifier += numDice * diceType; // Update modifier
            }
        }
    
        if (DPR - modifier > 0) {
            output += '+' + (DPR - modifier); // Add remaining modifier
        }
    
        output += ')</span>';
        return output;
    };

    const adjustEncounter = (difficulty) => {
        var minXPThreshold;
        var maxXPThreshold;
        if (difficulty == 'Easy') {
            minXPThreshold = document.getElementById('easyThreshold').innerHTML;
            maxXPThreshold = document.getElementById('mediumThreshold').innerHTML;
        }
        if (difficulty == 'Medium') {
            minXPThreshold = document.getElementById('mediumThreshold').innerHTML;
            maxXPThreshold = document.getElementById('hardThreshold').innerHTML;
        }
        if (difficulty == 'Hard') {
            minXPThreshold = document.getElementById('hardThreshold').innerHTML;
            maxXPThreshold = document.getElementById('deadlyThreshold').innerHTML;
        }
        if (difficulty == 'Deadly') {
            minXPThreshold = document.getElementById('deadlyThreshold').innerHTML;
            //maxXPThreshold = Number.POSITIVE_INFINITY; }
    
            maxXPThreshold = Math.max(
                document.getElementById('deadlyThreshold').innerHTML * 1.4,
                parseInt(document.getElementById('deadlyThreshold').innerHTML) + 200
            );
        } //Let a Deadly encounter be only 50% above deadly.  Still deadly but not impossibly high.
    
        var monsterArray = JSON.parse(localStorage.getItem('monsterArray'));
    
        var encounterSize = getEncounterSize(monsterArray);
    
        var onlyGroups = true; //false if there are some single monsters, true if every monster has at least 2
    
        for (var i = 0; i < monsterArray.length; i++) {
            if (monsterArray[i]['count'] == 1) {
                onlyGroups = false;
                break;
            }
        }
    
        var mob = false;
    
        //FIRST STEP: ADD OR REMOVE MONSTERS TO BETTER BALANCE WITH THE NUMBER OF PLAYERS
        if (calculateEncounterDifficulty(monsterArray) <= minXPThreshold) {
            do {
                for (var i = 0; i < monsterArray.length; i++) {
                    //If already 2 or more of the same monster, add some more.  Probably meant as a mob or group battle.
                    //If one of each monster, this is probably meant to be some individually strong monsters, so don't change numbers.
                    if (
                        monsterArray[i]['count'] >= 2 &&
                        encounterSize < partySize
                    ) {
                        mob = true;
                        monsterArray[i]['count'] += 1;
                        console.log('ADDING A ' + monsterArray[i]['monsterName']);
                    }
                    encounterSize = getEncounterSize(monsterArray);
                    if (
                        calculateEncounterDifficulty(monsterArray) >
                            minXPThreshold ||
                        encounterSize >= partySize - 1
                    )
                        break;
                }
            } while (encounterSize < partySize - 1 && mob == true); //If we added any monsters, and there are still more players than monsters, keep adding more.
        } else if (calculateEncounterDifficulty(monsterArray) > maxXPThreshold) {
            do {
                mob = false;
                for (var i = 0; i < monsterArray.length; i++) {
                    //If 2 or more of the same monster, try to lower until one of each monster or equal to number of players
                    if (
                        monsterArray[i]['count'] >= 2 &&
                        encounterSize > partySize
                    ) {
                        mob = true;
                        monsterArray[i]['count'] -= 1;
                        console.log('REMOVING A ' + monsterArray[i]['monsterName']);
                    }
                    encounterSize = getEncounterSize(monsterArray);
                    if (
                        calculateEncounterDifficulty(monsterArray) <=
                            maxXPThreshold ||
                        encounterSize <= partySize
                    )
                        break;
                }
            } while (encounterSize > partySize && mob == true);
        }
    
        console.log('encounter diff ' + calculateEncounterDifficulty(monsterArray));
        console.log('maxXPThreshold ' + maxXPThreshold);
    
        var k = 0;
    
        var change = false;
    
        var currentXP;
        var heavyMode = false;
    
        //SECOND STEP: RAISE OR LOWER CR OF EACH MONSTER TYPE ONE BY ONE
        while (
            calculateEncounterDifficulty(monsterArray) <= minXPThreshold ||
            calculateEncounterDifficulty(monsterArray) > maxXPThreshold
        ) {
            currentXP = calculateEncounterDifficulty(monsterArray);
            if (calculateEncounterDifficulty(monsterArray) > maxXPThreshold) {
                //Lower CR
                for (; k < monsterArray.length; k++) {
                    console.log(
                        'lowering difficulty of ' +
                            monsterArray[k]['monsterName'] +
                            '...'
                    );
                    monsterArray[k] = lowerCR(monsterArray[k]);
    
                    console.log(
                        'Total XP set to ' +
                            calculateEncounterDifficulty(monsterArray)
                    );
    
                    if (
                        calculateEncounterDifficulty(monsterArray) <= maxXPThreshold
                    )
                        break;
                }
            } else if (
                calculateEncounterDifficulty(monsterArray) <= minXPThreshold
            ) {
                //Raise CR
                for (; k < monsterArray.length; k++) {
                    console.log(
                        'raising difficulty of ' +
                            monsterArray[k]['monsterName'] +
                            '...'
                    );
                    var tempMonster = JSON.stringify(monsterArray[k]);
    
                    monsterArray[k] = raiseCR(monsterArray[k]);
                    //If this change was made to a group of monsters, thus pushing difficulty too high now, AND the whole encounter is only groups of monsters,
                    //      keep the weaker version of the monsters but just make the group larger.  This could help increase difficulty by a smaller amount.
                    if (
                        calculateEncounterDifficulty(monsterArray) > maxXPThreshold
                    ) {
                        console.log('uh oh.  Raised too high!');
    
                        monsterArray[k] = JSON.parse(tempMonster); //Return to previous weaker stats
    
                        //if(monsterArray[k]["count"] >= 2 && onlyGroups)
                        if (onlyGroups || heavyMode || monsterArray.length == 1)
                            //If just increasing CR raises it too much, try adding monsters (only if all monsters are in sets, or only one set of monsters)
                            monsterArray[k]['count'] += 1;
                    } else {
                        console.log('raised a good amount'); // Good.  Keep the changes (delete this branch later)
                    }
    
                    console.log(
                        'Total XP set to ' +
                            calculateEncounterDifficulty(monsterArray)
                    );
    
                    if (calculateEncounterDifficulty(monsterArray) > minXPThreshold)
                        break;
                }
            }
    
            if (currentXP == calculateEncounterDifficulty(monsterArray)) {
                //If no changes could be made, allow more severe changes.
                heavyMode = true;
            }
    
            k += 1;
            if (k >= monsterArray.length) k = 0; //We are doing this so if we break out of the loop we don't get stuck editing the same monster.
        }
    
        var originalMonsterArray = JSON.parse(localStorage.getItem('monsterArray'));
    
        var table = document.getElementById('monsterList');
        for (var i = 0; i < monsterArray.length; i++) {
            console.log(monsterArray[i]);
            var countCell = table.rows[i * 4 + 2].cells[1];
            countCell.innerHTML =
                printArrows(originalMonsterArray[i], monsterArray[i], 'count') +
                'Count: ' +
                monsterArray[i]['count'];
            var row = table.rows[i * 4 + 3];
            var adjustedStatsCell = row.cells[1];
    
            var DPRDiceDiv = document.createElement('div');
    
            //Fill list with details
            adjustedStatsCell.innerHTML = '';
    
            adjustedStatsCell.innerHTML +=
                printArrows(originalMonsterArray[i], monsterArray[i], 'totalCR') +
                "<span className='subTitle'>Challenge:</span> " +
                monsterArray[i]['totalCR'] +
                '<br/>' +
                '<svg height="5" width="160" style="fill: #922610; stroke: #922610; padding: 0px; margin: 0px;"><polyline points="3,1 160,2.5 3,4"></polyline></svg>' +
                "<table style='width: 100%; font-family: Noto Sans; border-collapse:separate; margin: 0px;'><tr>" +
                "<td style='padding: 0px;'>" +
                printArrows(
                    originalMonsterArray[i],
                    monsterArray[i],
                    'armorClass'
                ) +
                "<span className='subTitle'>AC</span> " +
                monsterArray[i]['armorClass'] +
                '</td>' +
                "<td style='padding: 0px;'>" +
                printArrows(originalMonsterArray[i], monsterArray[i], 'hitPoints') +
                "<span className='subTitle'>HP</span> " +
                monsterArray[i]['hitPoints'] +
                '</td></tr><tr>' +
                "<td style='padding: 0px;'>" +
                printArrows(
                    originalMonsterArray[i],
                    monsterArray[i],
                    'attackBonus'
                ) +
                "<span className='subTitle'>AB</span> " +
                monsterArray[i]['attackBonus'] +
                '</td>' +
                "<td style='padding: 0px;'>" +
                printArrows(
                    originalMonsterArray[i],
                    monsterArray[i],
                    'damagePerRound'
                ) +
                "<span className='subTitle'>DPR</span> " +
                monsterArray[i]['damagePerRound'] +
                '</td>' +
                "<td style='padding: 0px;'>" +
                '<button onClick="displayDPRDice(this.nextSibling)" className="diceButton"><img src="Dice.png"    alt="Dice"      width="18" height="18" style="padding: 4px; vertical-align:middle;"/></button>' +
                '<div className="diceDPRPanel">' +
                getDPRDiceText(
                    monsterArray[i]['damagePerRound'],
                    monsterArray[i]['attackBonus'] -
                        PBLevels[monsterArray[i]['totalCR']]
                ) +
                '</div>' +
                '</td></tr>' +
                '</table>';
    
            var atLeastOneFeat = false;
            for (
                var j = 0;
                j < Object.keys(originalMonsterArray[i]['monsterFeats']).length;
                j++
            ) {
                var feat = Object.keys(originalMonsterArray[i]['monsterFeats'])[j];
                if (originalMonsterArray[i]['monsterFeats'][feat]) {
                    if (atLeastOneFeat == false) {
                        atLeastOneFeat = true;
                        adjustedStatsCell.innerHTML +=
                            '<svg height="5" width="160" style="fill: #922610; stroke: #922610;"><polyline points="3,1 160,2.5 3,4"></polyline></svg>';
                    }
    
                    if (monsterArray[i]['monsterFeats'][feat]) {
                        adjustedStatsCell.innerHTML +=
                            '<img src="Transparent.png" alt="Blank" width="16" height="16" style="vertical-align:middle"/>';
                        adjustedStatsCell.innerHTML +=
                            "<span style='font: bold italic 0.8em Noto Sans;'>" +
                            feat +
                            '</span><br/>';
                    } else {
                        adjustedStatsCell.innerHTML +=
                            '<img src="RedX.png" alt="RedX" width="16" height="16" style="vertical-align:middle"/>';
                        adjustedStatsCell.innerHTML +=
                            "<span style='font: bold italic 0.8em Noto Sans; text-decoration: line-through; color: red;'>" +
                            feat +
                            '</span><br/>';
                    }
                }
            }
        }
        document.getElementById('adjustedDifficulty').innerHTML =
            calculateEncounterDifficulty(monsterArray);
        document.getElementById('rewardDifficulty').innerHTML =
            calculateEncounterXPReward(monsterArray);
    };
    

    const printArrows = (originalMonster, newMonster, index) => {
        if (newMonster[index] > originalMonster[index])
            return '<img src="UpArrow.png"   alt="UpArrow"   width="16" height="16" style="vertical-align:middle"/>';
        else if (newMonster[index] < originalMonster[index])
            return '<img src="DownArrow.png" alt="DownArrow" width="16" height="16" style="vertical-align:middle"/>';
        else
            return '<img src="Transparent.png"       alt="Equals"    width="16" height="16" style="vertical-align:middle"/>';
    }
    
    const setBaseCR = (val) => {
        AC = ACLevels[val];
        HP = HPLevels[val];
        totalCR = val;
        console.log(document.getElementById('armorClass'));
        document.getElementById('armorClass').value = AC;
        document.getElementById('hitPoints').value = HP;
        document.getElementById('challengeRating').value = totalCR;
    
        recalcTotalCR();
    };
    
    const addPartyRow = () => {
        var table = document.getElementById('partyList');
        var row = table.insertRow(-1);
        var numberCell = row.insertCell(-1);
        numberCell.innerHTML =
            "<input style='float:left; box-shadow:0px 3px 5px 1px rgb(124, 104, 74) inset; border:none; background-color: rgb(243, 203, 145); font: bold 1em Noto Sans; text-align:center;' type='text' size=10 onChange='calculatePartyThresholds();'/>";
        var levelCell = row.insertCell(-1);
        levelCell.innerHTML =
            "<input style='float:left; box-shadow:0px 3px 5px 1px rgb(124, 104, 74) inset; border:none; background-color: rgb(243, 203, 145); font: bold 1em Noto Sans; text-align:center;' type='text' size=10 onChange='calculatePartyThresholds();'/>";
        var deleteButtonCell = row.insertCell(-1);
        deleteButtonCell.innerHTML =
            "<button className='partyButton' onClick='deletePlayer(this.parentNode.parentNode.rowIndex)'>Delete</button>";
    };
    
    const deletePlayer = (playerIndex) => {
        var table = document.getElementById('partyList');
        table.deleteRow(playerIndex);
    };

    const calculatePartyThresholds = () => {
        var table = document.getElementById('partyList');
        partySize = 0; //Clear this count to start over
        var totalXPEasy = 0;
        var totalXPMedium = 0;
        var totalXPHard = 0;
        var totalXPDeadly = 0;
        for (var i = 1; i < table.rows.length; i++) {
            if (
                table.rows[i].cells[0].firstElementChild.value != '' &&
                table.rows[i].cells[1].firstElementChild.value != ''
            ) {
                //Skip rows with blanks
                var playerCount = parseInt(
                    table.rows[i].cells[0].firstElementChild.value
                );
                partySize += playerCount;
    
                var playerLevel = parseInt(
                    table.rows[i].cells[1].firstElementChild.value
                );
                totalXPEasy += playerCount * XPThresholdEasy[playerLevel];
                totalXPMedium += playerCount * XPThresholdMedium[playerLevel];
                totalXPHard += playerCount * XPThresholdHard[playerLevel];
                totalXPDeadly += playerCount * XPThresholdDeadly[playerLevel];
            }
        }
        document.getElementById('easyThreshold').innerHTML = totalXPEasy;
        document.getElementById('mediumThreshold').innerHTML = totalXPMedium;
        document.getElementById('hardThreshold').innerHTML = totalXPHard;
        document.getElementById('deadlyThreshold').innerHTML = totalXPDeadly;
    
        calculateEncounterDifficulty(
            JSON.parse(localStorage.getItem('monsterArray'))
        );
    };

    const getEncounterSize = (monsterArray) => {
        var encounterSize = 0;
    
        for (var i = 0; i < monsterArray.length; i++) {
            encounterSize += monsterArray[i]['count'];
        }
    
        return encounterSize;
    };
    
    const calculateEncounterDifficulty = (monsterArray) => {
        var encounterSize = 0;
        var totalXP = 0;
    
        for (var i = 0; i < monsterArray.length; i++) {
            var monsterData = monsterArray[i];
            var monsterCount = monsterData['count'];
            encounterSize += monsterCount;
    
            var monsterCR = monsterData['totalCR'];
            totalXP += monsterCount * XPLevels[monsterCR];
        }
    
        //Add modifiers for encounter size
        var multiplierIndex = 1;
        if (encounterSize == 1) multiplierIndex = 1;
        else if (encounterSize == 2) multiplierIndex = 2;
        else if (encounterSize >= 3 && encounterSize <= 6) multiplierIndex = 3;
        else if (encounterSize >= 7 && encounterSize <= 10) multiplierIndex = 4;
        else if (encounterSize >= 11 && encounterSize <= 14) multiplierIndex = 5;
        else if (encounterSize >= 15) multiplierIndex = 6;
    
        //Adjust modifier based on party size
        if (partySize <= 2) multiplierIndex += 1;
        else if (partySize >= 6) multiplierIndex -= 1;
    
        console.log('ENCOUNSIZE ' + encounterSize);
        console.log('MULTINDEX  ' + multiplierIndex);
        console.log('MULTIPLIER ' + encounterSizeMultipliers[multiplierIndex]);
    
        totalXP *= encounterSizeMultipliers[multiplierIndex];
    
        return totalXP;
    };

    const calculateEncounterXPReward = (monsterArray) => {
        var totalXP = 0;
    
        for (var i = 0; i < monsterArray.length; i++) {
            var monsterData = monsterArray[i];
            var monsterCount = monsterData['count'];
    
            var monsterCR = monsterData['totalCR'];
            totalXP += monsterCount * XPLevels[monsterCR];
        }
    
        return totalXP;
    };
    
    const setFeature = (value, isSet) => {
        monsterFeats[value] = isSet;
        recalcTotalCR();
    };
    
    const setFeatureNEW = (element) => {
        var isEnabled = (element.className = 'featEnabled');
        if (isEnabled) element.className = 'featDisabled';
        else element.className = 'featEnabled';
    
        monsterFeats[element.value] = !isEnabled;
        recalcTotalCR();
    };

    const addValue = (element, value) => {
        element.value = parseInt(element.value) + value;
        element.onChange();
    };

    const raiseCR = (monsterData) => {
        var baseHP = monsterData['hitPoints'];
        var baseAC = monsterData['armorClass'];
    
        var baseAB = monsterData['attackBonus'];
        var baseDPR = monsterData['damagePerRound'];
    
        var baseFeats = monsterData['monsterFeats'];
    
        var targetCR = nextHigherCR(monsterData['totalCR']);
    
        var effectiveTotalCR = monsterData['totalCR'];
        var effectiveOffensiveCR = recalcOffensiveCR(
            baseAB,
            baseDPR,
            baseHP,
            baseFeats
        );
        var effectiveDefensiveCR = recalcDefensiveCR(
            baseAC,
            baseHP,
            targetCR,
            baseFeats
        );
    
        //Repeat this until CR is raised by 1
        while (effectiveTotalCR < targetCR) {
            if (effectiveDefensiveCR < effectiveOffensiveCR) {
                //========----- RAISE DEFENSIVE CR
                //STEP 1: Raise base AC up to average level
                if (baseAC < ACLevels[targetCR]) {
                    baseAC += 1;
                    console.log('RAISED BASE AC to ' + baseAC);
                }
                //STEP 2: Raise base HP
                else if (baseHP < HPLevels[targetCR]) {
                    var baseHPCR = getHPCR(baseHP);
                    baseHP = Math.round(
                        (HPLevels[baseHPCR] + HPLevels[nextHigherCR(baseHPCR)]) / 2
                    );
                    console.log('RAISED BASE HP to ' + baseHP);
                }
                //STEP 3: Raise base AC up further
                else if (baseAC < ACLevels[targetCR] + 2) {
                    baseAC += 1;
                    console.log('RAISED BASE AC to ' + baseAC);
                }
                effectiveDefensiveCR = recalcDefensiveCR(
                    baseAC,
                    baseHP,
                    targetCR,
                    baseFeats
                );
                console.log('effectiveDefensiveCR ' + effectiveDefensiveCR);
            } //========----- RAISE OFFENSIVE CR
            else {
                //STEP 1: Raise base AB up to average level
                if (baseAB < ABLevels[targetCR]) {
                    baseAB += 1;
                    console.log('RAISED BASE AB to ' + baseAB);
                }
                //STEP 2: Raise base DPR
                else if (baseDPR < DPRLevels[targetCR]) {
                    var baseDPRCR = getDPRCR(baseDPR);
                    baseDPR = Math.round(
                        (DPRLevels[baseDPRCR] +
                            DPRLevels[nextHigherCR(baseDPRCR)]) /
                            2
                    );
                    console.log('RAISED BASE DPR to ' + baseDPR);
                }
                //STEP 3: Raise base AB up further
                else if (baseAB < ABLevels[targetCR] + 2) {
                    baseAB += 1;
                    console.log('RAISED BASE AB to ' + baseAB);
                }
                effectiveOffensiveCR = recalcOffensiveCR(
                    baseAB,
                    baseDPR,
                    baseHP,
                    baseFeats
                );
                console.log('effectiveOffensiveCR ' + effectiveOffensiveCR);
            }
            //Recalc total CR.  If total CR is target, end
            effectiveTotalCR = (effectiveDefensiveCR + effectiveOffensiveCR) / 2;
        }
    
        //Handle cases when totalCR is around the fractional CRs
        if (0 <= effectiveTotalCR && effectiveTotalCR < 1 / 16)
            effectiveTotalCR = 0;
        else if (1 / 16 <= effectiveTotalCR && effectiveTotalCR < 3 / 16)
            effectiveTotalCR = 1 / 8;
        else if (3 / 16 <= effectiveTotalCR && effectiveTotalCR < 6 / 16)
            effectiveTotalCR = 1 / 4;
        else if (6 / 16 <= effectiveTotalCR && effectiveTotalCR < 12 / 16)
            effectiveTotalCR = 1 / 2;
        else effectiveTotalCR = Math.round(effectiveTotalCR);
        console.log('effectiveTotalCR' + effectiveTotalCR);
    
        monsterData['hitPoints'] = baseHP;
        monsterData['armorClass'] = baseAC;
        monsterData['attackBonus'] = baseAB;
        monsterData['damagePerRound'] = baseDPR;
        monsterData['monsterFeats'] = baseFeats;
        monsterData['totalCR'] = effectiveTotalCR;
    
        return monsterData;
    };

    const lowerCR = (monsterData) => {
        //Given a monsterData array, return a modified one with CR one step lower
        //Capture initial monster stats
        var baseHP = monsterData['hitPoints'];
        var baseAC = monsterData['armorClass'];
    
        var baseAB = monsterData['attackBonus'];
        var baseDPR = monsterData['damagePerRound'];
    
        var baseFeats = monsterData['monsterFeats'];
    
        var targetCR = nextLowerCR(monsterData['totalCR']);
    
        var effectiveTotalCR = monsterData['totalCR'];
        var effectiveOffensiveCR = recalcOffensiveCR(
            baseAB,
            baseDPR,
            baseHP,
            baseFeats
        );
        console.log('OFFENSIVE??? : ' + effectiveOffensiveCR);
        var effectiveDefensiveCR = recalcDefensiveCR(
            baseAC,
            baseHP,
            targetCR,
            baseFeats
        );
        console.log('DEFENSIVE??? : ' + effectiveDefensiveCR);
    
        //Sort monster features by strength and store in a list
        //Offensive Features
        console.log(baseFeats);
        var monsterFeatsOffensive = [];
        if (baseFeats['DamageTransfer'])
            monsterFeatsOffensive.push('DamageTransfer');
        if (baseFeats['Enlarge']) monsterFeatsOffensive.push('Enlarge');
        if (baseFeats['MartialAdvantage'])
            monsterFeatsOffensive.push('MartialAdvantage');
        if (baseFeats['Swallow']) monsterFeatsOffensive.push('Swallow');
        if (baseFeats['Charge']) monsterFeatsOffensive.push('Charge');
        if (baseFeats['Dive']) monsterFeatsOffensive.push('Dive');
        if (baseFeats['Pounce']) monsterFeatsOffensive.push('Pounce');
        if (baseFeats['SurpriseAttack'])
            monsterFeatsOffensive.push('SurpriseAttack');
        if (baseFeats['WoundedFury']) monsterFeatsOffensive.push('WoundedFury');
        if (baseFeats['BloodFrenzy']) monsterFeatsOffensive.push('BloodFrenzy');
        if (baseFeats['NimbleEscape']) monsterFeatsOffensive.push('NimbleEscape');
        if (baseFeats['Ambusher']) monsterFeatsOffensive.push('Ambusher');
        if (baseFeats['PackTactics']) monsterFeatsOffensive.push('PackTactics');
        if (baseFeats['ElementalBody']) monsterFeatsOffensive.push('ElementalBody');
        if (baseFeats['Aggressive']) monsterFeatsOffensive.push('Aggressive');
        if (baseFeats['Rampage']) monsterFeatsOffensive.push('Rampage');
    
        console.log(monsterFeatsOffensive);
    
        //Defensive Features
        var monsterFeatsDefensive = [];
        if (baseFeats['NimbleEscape']) monsterFeatsDefensive.push('NimbleEscape');
        if (baseFeats['ShadowStealth']) monsterFeatsDefensive.push('ShadowStealth');
        if (baseFeats['Possession']) monsterFeatsDefensive.push('Possession');
        if (baseFeats['DamageTransfer'])
            monsterFeatsDefensive.push('DamageTransfer');
        if (baseFeats['SuperiorInvisibility'])
            monsterFeatsDefensive.push('SuperiorInvisibility');
        if (baseFeats['MagicResistance'])
            monsterFeatsDefensive.push('MagicResistance');
        if (baseFeats['FrightfulPresence'])
            monsterFeatsDefensive.push('FrightfulPresence');
        if (baseFeats['HorrifyingVisage'])
            monsterFeatsDefensive.push('HorrifyingVisage');
        if (baseFeats['Avoidance']) monsterFeatsDefensive.push('Avoidance');
        if (baseFeats['Constrict']) monsterFeatsDefensive.push('Constrict');
        if (baseFeats['Parry']) monsterFeatsDefensive.push('Parry');
        if (baseFeats['Stench']) monsterFeatsDefensive.push('Stench');
        if (baseFeats['Web']) monsterFeatsDefensive.push('Web');
        if (baseFeats['LegendaryResistance'])
            monsterFeatsDefensive.push('LegendaryResistance');
        if (baseFeats['UndeadFortitude'])
            monsterFeatsDefensive.push('UndeadFortitude');
        if (baseFeats['Relentless']) monsterFeatsDefensive.push('Relentless');
    
        //Repeat this until CR is lowered by 1
        while (effectiveTotalCR > targetCR) {
            if (effectiveDefensiveCR > effectiveOffensiveCR) {
                //========----- LOWER DEFENSIVE CR
                //STEP 1: Remove monster features until only one defensive feature is left
                if (monsterFeatsDefensive.length > 1) {
                    var featToCut = monsterFeatsDefensive[0];
                    delete baseFeats[featToCut];
                    monsterFeatsOffensive.splice(
                        monsterFeatsOffensive.indexOf(featToCut),
                        1
                    );
                    monsterFeatsDefensive = monsterFeatsDefensive.slice(1); //Take first item out of the FEAT list
                    console.log(monsterFeatsDefensive);
                    console.log('CUT OFF A DEFENSIVE MONSTER FEAT');
                }
                //STEP 2: Lower base AC up to a point
                else if (baseAC > ACLevels[targetCR] + 2) {
                    baseAC -= 1;
                    console.log('LOWERED BASE AC to ' + baseAC);
                }
                //STEP 3: Lower base HP
                else if (baseHP > HPLevels[targetCR]) {
                    var baseHPCR = getHPCR(baseHP);
                    baseHP = Math.round(
                        (HPLevels[nextLowerCR(baseHPCR)] +
                            HPLevels[nextLowerCR(nextLowerCR(baseHPCR))]) /
                            2
                    );
                    console.log('LOWERED BASE HP to ' + baseHP);
                }
                //STEP 4: Lower base AC even more
                else if (baseAC > ACLevels[targetCR]) {
                    baseAC -= 1;
                    console.log('LOWERED BASE AC to ' + baseAC);
                }
                //STEP 5: Remove all defensive features
                else if (monsterFeatsDefensive.length > 0) {
                    var featToCut = monsterFeatsDefensive[0];
                    delete baseFeats[featToCut];
                    monsterFeatsOffensive.splice(
                        monsterFeatsOffensive.indexOf(featToCut),
                        1
                    );
                    monsterFeatsDefensive = monsterFeatsDefensive.slice(1); //Take first item out of the FEAT list
                    console.log(monsterFeatsDefensive);
                    console.log('CUT OFF A DEFENSIVE MONSTER FEAT');
                }
                effectiveDefensiveCR = recalcDefensiveCR(
                    baseAC,
                    baseHP,
                    targetCR,
                    baseFeats
                );
                console.log('effectiveDefensiveCR ' + effectiveDefensiveCR);
            } //========----- LOWER OFFENSIVE CR
            else {
                //STEP 1: Remove monster features until only one offensive feature is left
                console.log('offensive feats: ' + monsterFeatsOffensive.length);
                if (monsterFeatsOffensive.length > 1) {
                    var featToCut = monsterFeatsOffensive[0];
                    console.log('feattocut ' + featToCut);
                    delete baseFeats[featToCut];
                    console.log('baseFeats ' + baseFeats);
                    monsterFeatsDefensive.splice(
                        monsterFeatsDefensive.indexOf(featToCut),
                        1
                    );
                    monsterFeatsOffensive = monsterFeatsOffensive.slice(1); //Take first item out of the FEAT list
                    console.log(monsterFeatsOffensive);
                    console.log('CUT OFF AN OFFENSIVE MONSTER FEAT');
                }
                //STEP 2: Lower base AB up to a point
                else if (baseAB > ABLevels[targetCR] + 2) {
                    baseAB -= 1;
                    console.log('LOWERED BASE AB to ' + baseAB);
                }
                //STEP 3: Lower base DPR
                else if (baseDPR > DPRLevels[targetCR]) {
                    var baseDPRCR = getDPRCR(baseDPR);
                    baseDPR = Math.round(
                        (DPRLevels[nextLowerCR(baseDPRCR)] +
                            DPRLevels[nextLowerCR(nextLowerCR(baseDPRCR))]) /
                            2
                    );
                    console.log('LOWERED BASE DPR to ' + baseDPR);
                }
                //STEP 4: Lower base AB even more
                else if (baseAB > ABLevels[targetCR]) {
                    baseAB -= 1;
                    console.log('LOWERED BASE AB to ' + baseAB);
                }
                //STEP 5: Remove all offensive features
                else if (monsterFeatsOffensive.length > 0) {
                    var featToCut = monsterFeatsOffensive[0];
                    console.log('feattocut ' + featToCut);
                    delete baseFeats[featToCut];
                    console.log('baseFeats ' + baseFeats);
                    monsterFeatsDefensive.splice(
                        monsterFeatsDefensive.indexOf(featToCut),
                        1
                    );
                    monsterFeatsOffensive = monsterFeatsOffensive.slice(1); //Take first item out of the FEAT list
                    console.log(monsterFeatsOffensive);
                    console.log('CUT OFF AN OFFENSIVE MONSTER FEAT');
                }
    
                if (DPR < 0) DPR = 0;
    
                DPR = Math.round(DPR);
    
                effectiveOffensiveCR = recalcOffensiveCR(
                    baseAB,
                    baseDPR,
                    baseHP,
                    baseFeats
                );
                console.log('effectiveOffensiveCR ' + effectiveOffensiveCR);
            } //END CALCULATING OFFENSIVE CR
    
            //Recalc total CR.  If total CR is target, end
            effectiveTotalCR = (effectiveDefensiveCR + effectiveOffensiveCR) / 2;
        }
    
        //Handle cases when totalCR is around the fractional CRs
        if (0 <= effectiveTotalCR && effectiveTotalCR < 1 / 16)
            effectiveTotalCR = 0;
        else if (1 / 16 <= effectiveTotalCR && effectiveTotalCR < 3 / 16)
            effectiveTotalCR = 1 / 8;
        else if (3 / 16 <= effectiveTotalCR && effectiveTotalCR < 6 / 16)
            effectiveTotalCR = 1 / 4;
        else if (6 / 16 <= effectiveTotalCR && effectiveTotalCR < 12 / 16)
            effectiveTotalCR = 1 / 2;
        else effectiveTotalCR = Math.round(effectiveTotalCR);
        console.log('effectiveTotalCR' + effectiveTotalCR);
    
        monsterData['hitPoints'] = baseHP;
        monsterData['armorClass'] = baseAC;
        monsterData['attackBonus'] = baseAB;
        monsterData['damagePerRound'] = baseDPR;
        monsterData['monsterFeats'] = baseFeats;
        monsterData['totalCR'] = effectiveTotalCR;
    
        return monsterData;
    };

    const recalcTotalCR = () => {
        var defensiveCR = recalcDefensiveCR(AC, HP, totalCR, monsterFeats);
        var offensiveCRStats = estimateOffensiveCR(
            defensiveCR,
            totalCR,
            monsterFeats
        );
        var offensiveCR = offensiveCRStats.offensiveCR;
        AB = offensiveCRStats.attackBonus;
        DPR = offensiveCRStats.damagePerRound;
    
        //Display Offensive Stats (Attack Bonus and Damage Per Round)
        document.getElementById('attackBonus').innerHTML = AB;
        document.getElementById('damagePerRound').innerHTML = DPR;
    };
    
    const CRtoFraction = (CR) => {
        if (CR == 0.125) return '1/8';
        else if (CR == 0.25) return '1/4';
        else if (CR == 0.5) return '1/2';
        else return CR;
    };

    const recalcDefensiveCR = (ACin, HPin, expectedCRin, FEATSin) => {
        //Get raw ARMOR CLASS and HIT POINTS
        var effectiveAC = ACin;
        var effectiveHP = HPin;
    
        //Add MONSTER FEAT bonuses
        if (FEATSin['Avoidance']) effectiveAC += 1;
        if (FEATSin['Constrict']) effectiveAC += 1;
        if (FEATSin['DamageTransfer']) effectiveHP *= 2;
        if (FEATSin['FrightfulPresence']) effectiveHP *= 1.25;
        if (FEATSin['HorrifyingVisage']) effectiveHP *= 1.25;
        if (FEATSin['LegendaryResistance']) {
            if (expectedCRin <= 4) effectiveHP += 10;
            else if (expectedCRin <= 10) effectiveHP += 20;
            else effectiveHP += 30;
        }
        if (FEATSin['MagicResistance']) effectiveAC += 2;
        if (FEATSin['NimbleEscape']) effectiveAC += 4;
        if (FEATSin['Parry']) effectiveAC += 1;
        if (FEATSin['Possession']) effectiveHP *= 2;
        if (FEATSin['Relentless']) {
            if (expectedCRin <= 4) effectiveHP += 7;
            else if (expectedCRin <= 10) effectiveHP += 14;
            else if (expectedCRin <= 16) effectiveHP += 21;
            else effectiveHP += 28;
        }
        if (FEATSin['ShadowStealth']) effectiveAC += 4;
        if (FEATSin['Stench']) effectiveAC += 1;
        if (FEATSin['SuperiorInvisibility']) effectiveAC += 2;
        if (FEATSin['UndeadFortitude']) {
            if (expectedCRin <= 4) effectiveHP += 7;
            else if (expectedCRin <= 10) effectiveHP += 14;
            else if (expectedCRin <= 16) effectiveHP += 21;
            else effectiveHP += 28;
        }
        if (FEATSin['Web']) effectiveAC += 1;
    
        //Get a defensive CR baseline based on HP
        var HPCR = getHPCR(effectiveHP);
        //Adjust defensive CR based on Armor Class
        var expectedAC = ACLevels[HPCR];
        var defensiveCR = nextCR(HPCR, ((effectiveAC - expectedAC) / 2) | 0);
    
        //Return result
        return defensiveCR;
    };
    
    const recalcOffensiveCR = (ABin, DPRin, HPin, FEATSin) => {
        //Get raw ATTACK BONUS and DAMAGE PER ROUND
        var effectiveAB = ABin;
        var effectiveDPR = DPRin;
    
        //Add MONSTER FEAT bonuses
        if (FEATSin['Aggressive']) effectiveDPR += 2;
        if (FEATSin['Ambusher']) effectiveAB += 1;
        if (FEATSin['BloodFrenzy']) effectiveAB += 4;
        if (FEATSin['Charge']) effectiveDPR /= 3 / 4;
        if (FEATSin['DamageTransfer']) effectiveDPR += HPin / 3;
        if (FEATSin['Dive']) effectiveDPR /= 3 / 4;
        if (FEATSin['ElementalBody']) effectiveDPR += 5;
        if (FEATSin['Enlarge']) effectiveDPR /= 1 / 2;
        if (FEATSin['MartialAdvantage']) effectiveDPR /= 2 / 3;
        if (FEATSin['NimbleEscape']) effectiveAB += 4;
        if (FEATSin['PackTactics']) effectiveAB += 1;
        if (FEATSin['Pounce']) effectiveDPR /= 3 / 4;
        if (FEATSin['Rampage']) effectiveDPR += 2;
        if (FEATSin['SurpriseAttack']) effectiveDPR /= 3 / 4;
        if (FEATSin['Swallow']) effectiveDPR /= 2 / 3;
        if (FEATSin['WoundedFury']) effectiveDPR /= 3 / 4;
    
        //Get a offensive CR baseline based on DPR
        var DPRCR = getDPRCR(effectiveDPR);
        //Adjust offensive CR based on Attack Bonus
        var expectedAB = ABLevels[DPRCR];
        var offensiveCR = nextCR(DPRCR, ((effectiveAB - expectedAB) / 2) | 0);
    
        //Return result
        return offensiveCR;
    };
    
    const estimateOffensiveCR = (defensiveCRin, totalCRin, FEATSin) => {
        var offensiveCR = totalCRin * 2 - defensiveCRin;
    
        //Handle cases when offensiveCR is a weird fraction
        if (offensiveCR < 1 / 16) offensiveCR = 0;
        else if (1 / 16 <= offensiveCR && offensiveCR < 3 / 16) offensiveCR = 1 / 8;
        else if (3 / 16 <= offensiveCR && offensiveCR < 6 / 16) offensiveCR = 1 / 4;
        else if (6 / 16 <= offensiveCR && offensiveCR < 12 / 16)
            offensiveCR = 1 / 2;
        else offensiveCR = Math.round(offensiveCR);
    
        //Estimate ATTACK BONUS given the calculated offensive CR
        var AB = ABLevels[offensiveCR];
    
        //Estimate DAMAGE PER ROUND given the calculated offensive CR
        var rangeLower = DPRLevels[nextLowerCR(offensiveCR)] + 1;
        var rangeUpper = DPRLevels[offensiveCR];
        var DPR = Math.ceil((rangeLower + rangeUpper) / 2); //Put DPR at the middle value for this CR
    
        //Add MONSTER FEAT bonuses
        if (FEATSin['Aggressive']) DPR -= 2;
        if (FEATSin['Ambusher']) AB -= 1;
        if (FEATSin['BloodFrenzy']) AB -= 4;
        if (FEATSin['Charge']) DPR *= 3 / 4; //Increases DPR of one attack (to about double).  Not included in Monster DPR
        if (FEATSin['DamageTransfer']) DPR -= HP / 3;
        if (FEATSin['Dive']) DPR *= 3 / 4; //Increases DPR of one round (to about double).  Not included in Monster DPR.
        if (FEATSin['ElementalBody']) DPR -= 5; //Increases total DPR (usually by about 5).
        if (FEATSin['Enlarge']) DPR *= 1 / 2; //Increases total DPR by about 100%.
        if (FEATSin['MartialAdvantage']) DPR *= 2 / 3; //Increases total DPR by about 50%.
        if (FEATSin['NimbleEscape']) AB -= 4;
        if (FEATSin['PackTactics']) AB -= 1;
        if (FEATSin['Pounce']) DPR *= 3 / 4; //Increases DPR of one attack (essentially double)
        if (FEATSin['Rampage']) DPR -= 2;
        if (FEATSin['SurpriseAttack']) DPR *= 3 / 4; //Increases DPR of one attack (essentially double)
        if (FEATSin['Swallow']) DPR *= 2 / 3; //Increases DPR by about 50%, but varies greatly
        if (FEATSin['WoundedFury']) DPR *= 3 / 4; //Increases DPR of one round (to about double).  Not included in Monster DPR.
    
        if (DPR < 0) DPR = 0;
    
        DPR = Math.round(DPR);
    
        //Return results
        return { offensiveCR: offensiveCR, attackBonus: AB, damagePerRound: DPR };
    };
    
    const nextLowerCR = (current) => {
        if (current == 1) return 1 / 2;
        else if (current == 1 / 2) return 1 / 4;
        else if (current == 1 / 4) return 1 / 8;
        else if (current == 1 / 8) return 0;
        else if (current == 0) return 0;
        else return current - 1;
    };
    
    const nextHigherCR = (current) => {
        if (current == 0) return 1 / 8;
        else if (current == 1 / 8) return 1 / 4;
        else if (current == 1 / 4) return 1 / 2;
        else if (current == 1 / 2) return 1;
        else if (current == 30) return 30;
        else return current + 1;
    };


    const nextCR = (current, diff) => {
        var result = current;
        if (diff > 0) {
            for (var i = 0; i < diff; i++) {
                result = nextHigherCR(result);
            }
        } else {
            for (var i = diff; i < 0; i++) {
                result = nextLowerCR(result);
            }
        }
        return result;
    }
    
    const getHPCR = (HP) => {
        var HPCR = 0;
    
        if (1 <= HP && HP <= 6) HPCR = 0;
        else if (7 <= HP && HP <= 35) HPCR = 1 / 8;
        else if (36 <= HP && HP <= 49) HPCR = 1 / 4;
        else if (50 <= HP && HP <= 70) HPCR = 1 / 2;
        else if (71 <= HP && HP <= 85) HPCR = 1;
        else if (86 <= HP && HP <= 100) HPCR = 2;
        else if (101 <= HP && HP <= 115) HPCR = 3;
        else if (116 <= HP && HP <= 130) HPCR = 4;
        else if (131 <= HP && HP <= 145) HPCR = 5;
        else if (146 <= HP && HP <= 160) HPCR = 6;
        else if (161 <= HP && HP <= 175) HPCR = 7;
        else if (176 <= HP && HP <= 190) HPCR = 8;
        else if (191 <= HP && HP <= 205) HPCR = 9;
        else if (206 <= HP && HP <= 220) HPCR = 10;
        else if (221 <= HP && HP <= 235) HPCR = 11;
        else if (236 <= HP && HP <= 250) HPCR = 12;
        else if (251 <= HP && HP <= 265) HPCR = 13;
        else if (266 <= HP && HP <= 280) HPCR = 14;
        else if (281 <= HP && HP <= 295) HPCR = 15;
        else if (296 <= HP && HP <= 310) HPCR = 16;
        else if (311 <= HP && HP <= 325) HPCR = 17;
        else if (326 <= HP && HP <= 340) HPCR = 18;
        else if (341 <= HP && HP <= 355) HPCR = 19;
        else if (356 <= HP && HP <= 400) HPCR = 20;
        else if (401 <= HP && HP <= 445) HPCR = 21;
        else if (446 <= HP && HP <= 490) HPCR = 22;
        else if (491 <= HP && HP <= 535) HPCR = 23;
        else if (536 <= HP && HP <= 580) HPCR = 24;
        else if (581 <= HP && HP <= 625) HPCR = 25;
        else if (626 <= HP && HP <= 670) HPCR = 26;
        else if (671 <= HP && HP <= 715) HPCR = 27;
        else if (716 <= HP && HP <= 760) HPCR = 28;
        else if (761 <= HP && HP <= 805) HPCR = 29;
        else if (806 <= HP && HP <= 850) HPCR = 30;
    
        return HPCR;
    };
    
    const getDPRCR = (DPR) => {
        var DPRCR = 0;
    
        if (0 <= DPR && DPR <= 1) DPRCR = 0;
        else if (2 <= DPR && DPR <= 3) DPRCR = 1 / 8;
        else if (4 <= DPR && DPR <= 5) DPRCR = 1 / 4;
        else if (6 <= DPR && DPR <= 8) DPRCR = 1 / 2;
        else if (9 <= DPR && DPR <= 14) DPRCR = 1;
        else if (15 <= DPR && DPR <= 20) DPRCR = 2;
        else if (21 <= DPR && DPR <= 26) DPRCR = 3;
        else if (27 <= DPR && DPR <= 32) DPRCR = 4;
        else if (33 <= DPR && DPR <= 38) DPRCR = 5;
        else if (39 <= DPR && DPR <= 44) DPRCR = 6;
        else if (45 <= DPR && DPR <= 50) DPRCR = 7;
        else if (51 <= DPR && DPR <= 56) DPRCR = 8;
        else if (57 <= DPR && DPR <= 62) DPRCR = 9;
        else if (63 <= DPR && DPR <= 68) DPRCR = 10;
        else if (69 <= DPR && DPR <= 74) DPRCR = 11;
        else if (75 <= DPR && DPR <= 80) DPRCR = 12;
        else if (81 <= DPR && DPR <= 86) DPRCR = 13;
        else if (87 <= DPR && DPR <= 92) DPRCR = 14;
        else if (93 <= DPR && DPR <= 98) DPRCR = 15;
        else if (99 <= DPR && DPR <= 104) DPRCR = 16;
        else if (105 <= DPR && DPR <= 110) DPRCR = 17;
        else if (111 <= DPR && DPR <= 116) DPRCR = 18;
        else if (117 <= DPR && DPR <= 122) DPRCR = 19;
        else if (123 <= DPR && DPR <= 140) DPRCR = 20;
        else if (141 <= DPR && DPR <= 158) DPRCR = 21;
        else if (159 <= DPR && DPR <= 176) DPRCR = 22;
        else if (177 <= DPR && DPR <= 194) DPRCR = 23;
        else if (195 <= DPR && DPR <= 212) DPRCR = 24;
        else if (213 <= DPR && DPR <= 230) DPRCR = 25;
        else if (231 <= DPR && DPR <= 248) DPRCR = 26;
        else if (249 <= DPR && DPR <= 266) DPRCR = 27;
        else if (267 <= DPR && DPR <= 284) DPRCR = 28;
        else if (285 <= DPR && DPR <= 302) DPRCR = 29;
        else if (303 <= DPR && DPR <= 320) DPRCR = 30;
    
        return DPRCR;
    };
    
    
    const saveMonster = () => {
        //Collect monster data into an object to save
        var monsterData = {};
        monsterData['monsterName'] = document.getElementById('monsterName').value;
        monsterData['armorClass'] = AC;
        monsterData['hitPoints'] = HP;
        monsterData['attackBonus'] = AB;
        monsterData['damagePerRound'] = DPR;
        monsterData['monsterFeats'] = monsterFeats;
        monsterData['totalCR'] = totalCR;
        monsterData['totalXP'] = XPLevels[totalCR];
    
        var monsterArray = JSON.parse(localStorage.getItem('monsterArray'));
    
        var nameCell;
        var originalStatsCell;
    
        //Edit monster table
        if (editing == true) {
            //If we are editing an existing monster, just overwrite the old table data
            var table = document.getElementById('monsterList');
    
            nameCell = table.rows[editingMonster * 4].cells[0];
            originalStatsCell = table.rows[editingMonster * 4 + 3].cells[0];
    
            monsterData['count'] = monsterArray[editingMonster]['count'];
    
            monsterArray.splice(editingMonster, 1, monsterData); //Replace edited monster in list
            editing = false;
        } //Otherwise create a new row in the table
        else {
            var table = document.getElementById('monsterList');
            table.style.width = '300px';
            table.style =
                'border-collapse: separate; border-spacing: 0px 0px; border: none;';
            editingMonster = table.rows.length;
            var monsterBlock = table.appendChild(document.createElement('tbody'));
            monsterBlock.style =
                'box-shadow: 0px 4px 5px black; background-color: rgb(128, 0, 0); display: block;';
            monsterBlock.className = 'monsterBlock';
            var titleRow = monsterBlock.insertRow(-1);
            var nameCell = titleRow.insertCell(-1);
            nameCell.colSpan = 2;
    
            nameCell.className = 'nameBlock';
            var spaceRow = table.insertRow(-1);
            spaceRow.style = 'height: 5px;';
            var countRow = table.insertRow(-1);
            var originalCountCell = countRow.insertCell(-1);
            originalCountCell.innerHTML =
                '<table>' +
                '      <tr>' +
                "    <td style='font: small-caps 700 1.0em Libre Baskerville;'>Count:</td>" +
                '    <td>1</td>' +
                "        <td><button className='plusButton' onClick='changeMonsterCount(this,  1);'>+</button>" +
                "        <button className='plusButton' onClick='changeMonsterCount(this, -1);'>-</button></td>" +
                '  </tr>' +
                '</table>';
            originalCountCell.className = 'countBlock';
            originalCountCell.style.width = '42%';
            var adjustedCountCell = countRow.insertCell(-1);
            adjustedCountCell.className = 'countBlock';
    
            var statsRow = table.insertRow(-1);
            originalStatsCell = statsRow.insertCell(-1);
            originalStatsCell.className = 'statsBlock';
            var adjustedStatsCell = statsRow.insertCell(-1);
            adjustedStatsCell.className = 'statsBlock';
            var space = table.appendChild(document.createElement('tbody'));
            space.className = 'spaceTBody';
            monsterData['count'] = 1;
    
            monsterArray.splice(monsterArray.length, 0, monsterData); //Append new monster to end of list
        }
    
        //Fill out monster name
        var newMonsterName;
        if (document.getElementById('monsterName').value == '')
            newMonsterName =
                'Monster #' +
                document.getElementById('monsterList').rows.length / 4;
        else newMonsterName = document.getElementById('monsterName').value;
        nameCell.innerHTML =
            newMonsterName +
            "<button className='editButton' onClick='deleteMonster(this.parentNode.parentNode.rowIndex / 4)'>Delete</button>" +
            "<button className='editButton' onClick='editMonster  (this.parentNode.parentNode.rowIndex / 4)'>Edit</button>";
    
        //Fill list with details
        /*originalStatsCell.innerHTML = "<b>Challenge:</b> " + monsterData["totalCR"] + "<br/>"
                                                                                    + '<svg height="5" width="140" style="fill: #922610; stroke: #922610;"><polyline points="3,1 140,2.5 3,4"></polyline></svg>'
                                                                                    + "<b>Armor Class:</b> " + monsterData["armorClass"] + "<br/>"
                                                                                    + "<b>Hit Points:</b> " + monsterData["hitPoints"] + "<br/>"
                                                                                    + "<b>Attack Bonus:</b> " + monsterData["attackBonus"] + "<br/>"
                                                                                    + "<b>Damage / Round:</b> " + monsterData["damagePerRound"] + "<br/>";*/
    
        originalStatsCell.innerHTML =
            "<span className='subTitle'>Challenge:</span> " +
            monsterData['totalCR'] +
            '<br/>' +
            '<svg height="5" width="120" style="fill: #922610; stroke: #922610;"><polyline points="3,1 120,2.5 3,4"></polyline></svg>' +
            "<table style='width: 100%; font-family: Noto Sans; border-collapse:separate; margin: 0px;'><tr>" +
            "<td style='padding: 0px;'><span className='subTitle'>AC</span> " +
            monsterData['armorClass'] +
            '</td>' +
            "<td style='padding: 0px;'><span className='subTitle'>HP</span> " +
            monsterData['hitPoints'] +
            '</td></tr><tr>' +
            "<td style='padding: 0px;'><span className='subTitle'>AB</span> " +
            monsterData['attackBonus'] +
            '</td>' +
            "<td style='padding: 0px;'><span className='subTitle'>DPR</span> " +
            monsterData['damagePerRound'] +
            '</td></tr>' +
            '</table>';
    
        var atLeastOneFeat = false;
        for (var i = 0; i < Object.keys(monsterData['monsterFeats']).length; i++) {
            var feat = Object.keys(monsterData['monsterFeats'])[i];
            if (monsterData['monsterFeats'][feat] == true) {
                if (atLeastOneFeat == false) {
                    atLeastOneFeat = true;
                    originalStatsCell.innerHTML +=
                        '<svg height="5" width="120" style="fill: #922610; stroke: #922610;"><polyline points="3,1 120,2.5 3,4"></polyline></svg>';
                }
                originalStatsCell.innerHTML +=
                    "<span style='font: bold italic 0.8em Noto Sans;'>" +
                    feat +
                    '</span><br/>';
            }
        }
    
        //Enable Desired Difficulty buttons
        if (monsterArray.length >= 1) {
            document.getElementById('easyButton').disabled = false;
            document.getElementById('mediumButton').disabled = false;
            document.getElementById('hardButton').disabled = false;
            document.getElementById('deadlyButton').disabled = false;
        }
    
        //Save changes to local storage
        localStorage.setItem('monsterArray', JSON.stringify(monsterArray));
        document.getElementById('encounterDifficulty').innerHTML =
            calculateEncounterDifficulty(monsterArray);
    };

    const changeMonsterCount = (element, diff) => {
        var countCell = element.parentNode.parentNode.cells[1];
        countCell.innerHTML = parseInt(countCell.innerHTML) + diff;
    
        //                      Button    Cell          Row               Table Body   Table     Cell           Row
        var index =
            element.parentNode.parentNode.parentNode.parentNode.parentNode
                .parentNode.rowIndex;
        console.log(
            element.parentNode.parentNode.parentNode.parentNode.parentNode
                .parentNode
        );
        var monsterArray = JSON.parse(localStorage.getItem('monsterArray'));
        monsterArray[(index - 2) / 4]['count'] = parseInt(countCell.innerHTML);
    
        localStorage.setItem('monsterArray', JSON.stringify(monsterArray));
    
        document.getElementById('encounterDifficulty').innerHTML =
            calculateEncounterDifficulty(monsterArray);
    };
    
    const editMonster = (monsterIndex) => {
        //Read stored list
        var monsterArray = JSON.parse(localStorage.getItem('monsterArray'));
        var monsterData = monsterArray[monsterIndex];
        console.log(monsterIndex);
        console.log(monsterData);
        console.log(monsterArray);
        document.getElementById('monsterName').value = monsterData['monsterName'];
    
        document.getElementById('challengeRating').value = monsterData['totalCR'];
        document.getElementById('challengeRating').onChange();
        document.getElementById('armorClass').value = monsterData['armorClass'];
        document.getElementById('armorClass').onChange();
        document.getElementById('hitPoints').value = monsterData['hitPoints'];
        document.getElementById('hitPoints').onChange();
    
        editing = true;
        editingMonster = monsterIndex;
        for (var i = 0; i < Object.keys(monsterData['monsterFeats']).length; i++) {
            var checkbox = document.querySelector(
                'input[value="' + Object.keys(monsterData['monsterFeats'])[i] + '"]'
            );
            console.log(checkbox);
            checkbox.checked = true;
        }
    
        //Save changes to local storage
        localStorage.setItem('monsterArray', JSON.stringify(monsterArray));
    };

    const deleteMonster = (monsterIndex) => {
        var table = document.getElementById('monsterList');
        console.log(monsterIndex);
        table.removeChild(table.rows[monsterIndex * 4].parentNode.nextSibling);
        table.removeChild(table.rows[monsterIndex * 4].parentNode);
    
        //Edit stored list
        var monsterArray = JSON.parse(localStorage.getItem('monsterArray'));
        monsterArray.splice(monsterIndex, 1);
    
        console.log(monsterArray);
    
        //Enable Desired Difficulty buttons
        if (monsterArray.length == 0) {
            document.getElementById('easyButton').disabled = true;
            document.getElementById('mediumButton').disabled = true;
            document.getElementById('hardButton').disabled = true;
            document.getElementById('deadlyButton').disabled = true;
        }
    
        //Save changes to local storage
        localStorage.setItem('monsterArray', JSON.stringify(monsterArray));
    
        document.getElementById('encounterDifficulty').innerHTML =
            calculateEncounterDifficulty(monsterArray);
    };
    
    const setupPage = () => {
        AC = ACLevels[1];
        HP = HPLevels[1];
        totalCR = 1;
    
        document.getElementById('armorClass').value = AC;
        document.getElementById('hitPoints').value = HP;
        document.getElementById('challengeRating').value = totalCR;
    
        recalcTotalCR();
    
        document.getElementById('partySize').value = 4;
        document.getElementById('partyLevel').value = 1;
    
        var monsterArray = [];
        localStorage.setItem('monsterArray', JSON.stringify(monsterArray));
    
        var encounterArray = [];
        localStorage.setItem('encounterArray', JSON.stringify(encounterArray));
    
        calculatePartyThresholds();
    
        document.getElementById('easyButton').disabled = true;
        document.getElementById('mediumButton').disabled = true;
        document.getElementById('hardButton').disabled = true;
        document.getElementById('deadlyButton').disabled = true;
    };


    var encounterSizeMultipliers = {};
    encounterSizeMultipliers[0] = 0.5;
    encounterSizeMultipliers[1] = 1.0;
    encounterSizeMultipliers[2] = 1.5;
    encounterSizeMultipliers[3] = 2.0;
    encounterSizeMultipliers[4] = 2.5;
    encounterSizeMultipliers[5] = 3.0;
    encounterSizeMultipliers[6] = 4.0;
    encounterSizeMultipliers[7] = 5.0;
    
    //====-- XP THRESHOLDS --====//
    //XP Thresholds (EASY)
    var XPThresholdEasy = {};
    XPThresholdEasy[1] = 25;
    XPThresholdEasy[6] = 300;
    XPThresholdEasy[11] = 800;
    XPThresholdEasy[16] = 1600;
    XPThresholdEasy[2] = 50;
    XPThresholdEasy[7] = 350;
    XPThresholdEasy[12] = 1000;
    XPThresholdEasy[17] = 2000;
    XPThresholdEasy[3] = 75;
    XPThresholdEasy[8] = 450;
    XPThresholdEasy[13] = 1100;
    XPThresholdEasy[18] = 2100;
    XPThresholdEasy[4] = 125;
    XPThresholdEasy[9] = 550;
    XPThresholdEasy[14] = 1250;
    XPThresholdEasy[19] = 2400;
    XPThresholdEasy[5] = 250;
    XPThresholdEasy[10] = 600;
    XPThresholdEasy[15] = 1400;
    XPThresholdEasy[20] = 2800;
    //XP Thresholds (MEDIUM)
    var XPThresholdMedium = {};
    XPThresholdMedium[1] = 50;
    XPThresholdMedium[6] = 600;
    XPThresholdMedium[11] = 1600;
    XPThresholdMedium[16] = 3200;
    XPThresholdMedium[2] = 100;
    XPThresholdMedium[7] = 750;
    XPThresholdMedium[12] = 2000;
    XPThresholdMedium[17] = 3900;
    XPThresholdMedium[3] = 150;
    XPThresholdMedium[8] = 900;
    XPThresholdMedium[13] = 2200;
    XPThresholdMedium[18] = 4200;
    XPThresholdMedium[4] = 250;
    XPThresholdMedium[9] = 1100;
    XPThresholdMedium[14] = 2500;
    XPThresholdMedium[19] = 4900;
    XPThresholdMedium[5] = 500;
    XPThresholdMedium[10] = 1200;
    XPThresholdMedium[15] = 2800;
    XPThresholdMedium[20] = 5700;
    //XP Thresholds (HARD)
    var XPThresholdHard = {};
    XPThresholdHard[1] = 75;
    XPThresholdHard[6] = 900;
    XPThresholdHard[11] = 2400;
    XPThresholdHard[16] = 4800;
    XPThresholdHard[2] = 150;
    XPThresholdHard[7] = 1100;
    XPThresholdHard[12] = 3000;
    XPThresholdHard[17] = 5900;
    XPThresholdHard[3] = 225;
    XPThresholdHard[8] = 1400;
    XPThresholdHard[13] = 3400;
    XPThresholdHard[18] = 6300;
    XPThresholdHard[4] = 375;
    XPThresholdHard[9] = 1600;
    XPThresholdHard[14] = 3800;
    XPThresholdHard[19] = 7300;
    XPThresholdHard[5] = 750;
    XPThresholdHard[10] = 1900;
    XPThresholdHard[15] = 4300;
    XPThresholdHard[20] = 8500;
    //XP Thresholds (DEADLY)
    var XPThresholdDeadly = {};
    XPThresholdDeadly[1] = 100;
    XPThresholdDeadly[6] = 1400;
    XPThresholdDeadly[11] = 3600;
    XPThresholdDeadly[16] = 7200;
    XPThresholdDeadly[2] = 200;
    XPThresholdDeadly[7] = 1700;
    XPThresholdDeadly[12] = 4500;
    XPThresholdDeadly[17] = 8800;
    XPThresholdDeadly[3] = 400;
    XPThresholdDeadly[8] = 2100;
    XPThresholdDeadly[13] = 5100;
    XPThresholdDeadly[18] = 9500;
    XPThresholdDeadly[4] = 500;
    XPThresholdDeadly[9] = 2400;
    XPThresholdDeadly[14] = 5700;
    XPThresholdDeadly[19] = 10900;
    XPThresholdDeadly[5] = 1100;
    XPThresholdDeadly[10] = 2800;
    XPThresholdDeadly[15] = 6400;
    XPThresholdDeadly[20] = 12700;
    //====-----------------------====//
    //Estimated Armor Class at each level
    var ACLevels = {};
    ACLevels[0] = 13;
    ACLevels[1] = 13;
    ACLevels[11] = 17;
    ACLevels[21] = 19;
    ACLevels[1 / 8] = 13;
    ACLevels[2] = 13;
    ACLevels[12] = 17;
    ACLevels[22] = 19;
    ACLevels[1 / 4] = 13;
    ACLevels[3] = 13;
    ACLevels[13] = 18;
    ACLevels[23] = 19;
    ACLevels[1 / 2] = 13;
    ACLevels[4] = 14;
    ACLevels[14] = 18;
    ACLevels[24] = 19;
    ACLevels[5] = 15;
    ACLevels[15] = 18;
    ACLevels[25] = 19;
    ACLevels[6] = 15;
    ACLevels[16] = 18;
    ACLevels[26] = 19;
    ACLevels[7] = 15;
    ACLevels[17] = 19;
    ACLevels[27] = 19;
    ACLevels[8] = 16;
    ACLevels[18] = 19;
    ACLevels[28] = 19;
    ACLevels[9] = 16;
    ACLevels[19] = 19;
    ACLevels[29] = 19;
    ACLevels[10] = 17;
    ACLevels[20] = 19;
    ACLevels[30] = 19;
    //Estimated Hit Points at each level
    var HPLevels = {};
    HPLevels[0] = 6;
    HPLevels[1] = 85;
    HPLevels[11] = 235;
    HPLevels[21] = 445;
    HPLevels[1 / 8] = 35;
    HPLevels[2] = 100;
    HPLevels[12] = 250;
    HPLevels[22] = 490;
    HPLevels[1 / 4] = 49;
    HPLevels[3] = 115;
    HPLevels[13] = 265;
    HPLevels[23] = 535;
    HPLevels[1 / 2] = 70;
    HPLevels[4] = 130;
    HPLevels[14] = 280;
    HPLevels[24] = 580;
    HPLevels[5] = 145;
    HPLevels[15] = 295;
    HPLevels[25] = 625;
    HPLevels[6] = 160;
    HPLevels[16] = 310;
    HPLevels[26] = 670;
    HPLevels[7] = 175;
    HPLevels[17] = 325;
    HPLevels[27] = 715;
    HPLevels[8] = 190;
    HPLevels[18] = 340;
    HPLevels[28] = 760;
    HPLevels[9] = 205;
    HPLevels[19] = 355;
    HPLevels[29] = 805;
    HPLevels[10] = 220;
    HPLevels[20] = 400;
    HPLevels[30] = 850;
    
    //Estimated Attack Bonus at each level
    var ABLevels = {};
    ABLevels[0] = 3;
    ABLevels[1] = 3;
    ABLevels[11] = 8;
    ABLevels[21] = 11;
    ABLevels[1 / 8] = 3;
    ABLevels[2] = 3;
    ABLevels[12] = 8;
    ABLevels[22] = 11;
    ABLevels[1 / 4] = 3;
    ABLevels[3] = 4;
    ABLevels[13] = 8;
    ABLevels[23] = 11;
    ABLevels[1 / 2] = 3;
    ABLevels[4] = 5;
    ABLevels[14] = 8;
    ABLevels[24] = 12;
    ABLevels[5] = 6;
    ABLevels[15] = 8;
    ABLevels[25] = 12;
    ABLevels[6] = 6;
    ABLevels[16] = 9;
    ABLevels[26] = 12;
    ABLevels[7] = 6;
    ABLevels[17] = 10;
    ABLevels[27] = 13;
    ABLevels[8] = 7;
    ABLevels[18] = 10;
    ABLevels[28] = 13;
    ABLevels[9] = 7;
    ABLevels[19] = 10;
    ABLevels[29] = 13;
    ABLevels[10] = 7;
    ABLevels[20] = 10;
    ABLevels[30] = 14;
    
    //Max Damage per Round at each level
    var DPRLevels = {};
    DPRLevels[1] = 14;
    DPRLevels[11] = 74;
    DPRLevels[21] = 158;
    DPRLevels[0] = 1;
    DPRLevels[2] = 20;
    DPRLevels[12] = 80;
    DPRLevels[22] = 176;
    DPRLevels[1 / 8] = 3;
    DPRLevels[3] = 26;
    DPRLevels[13] = 86;
    DPRLevels[23] = 194;
    DPRLevels[1 / 4] = 5;
    DPRLevels[4] = 32;
    DPRLevels[14] = 92;
    DPRLevels[24] = 212;
    DPRLevels[1 / 2] = 8;
    DPRLevels[5] = 38;
    DPRLevels[15] = 98;
    DPRLevels[25] = 230;
    DPRLevels[6] = 44;
    DPRLevels[16] = 104;
    DPRLevels[26] = 248;
    DPRLevels[7] = 50;
    DPRLevels[17] = 110;
    DPRLevels[27] = 266;
    DPRLevels[8] = 56;
    DPRLevels[18] = 116;
    DPRLevels[28] = 284;
    DPRLevels[9] = 62;
    DPRLevels[19] = 122;
    DPRLevels[29] = 302;
    DPRLevels[10] = 68;
    DPRLevels[20] = 140;
    DPRLevels[30] = 320;
    
    //XP at each level
    var XPLevels = {};
    XPLevels[0] = 10;
    XPLevels[1 / 8] = 25;
    XPLevels[1 / 4] = 50;
    XPLevels[1 / 2] = 100;
    XPLevels[1] = 200;
    XPLevels[2] = 450;
    XPLevels[3] = 700;
    XPLevels[4] = 1100;
    XPLevels[5] = 1800;
    XPLevels[6] = 2300;
    XPLevels[7] = 2900;
    XPLevels[8] = 3900;
    XPLevels[9] = 5000;
    XPLevels[10] = 5900;
    XPLevels[11] = 7200;
    XPLevels[12] = 8400;
    XPLevels[13] = 10000;
    XPLevels[14] = 11500;
    XPLevels[15] = 13000;
    XPLevels[16] = 15000;
    XPLevels[17] = 18000;
    XPLevels[18] = 20000;
    XPLevels[19] = 22000;
    XPLevels[20] = 25000;
    XPLevels[21] = 33000;
    XPLevels[22] = 41000;
    XPLevels[23] = 50000;
    XPLevels[24] = 62000;
    XPLevels[25] = 75000;
    XPLevels[26] = 90000;
    XPLevels[27] = 105000;
    XPLevels[28] = 120000;
    XPLevels[29] = 135000;
    XPLevels[30] = 155000;
    
    //Estimated Proficiency Bonus at each level
    var PBLevels = {};
    PBLevels[0] = 2;
    PBLevels[1 / 8] = 2;
    PBLevels[1 / 4] = 2;
    PBLevels[1 / 2] = 2;
    PBLevels[1] = 2;
    PBLevels[2] = 2;
    PBLevels[3] = 2;
    PBLevels[4] = 2;
    PBLevels[5] = 3;
    PBLevels[6] = 3;
    PBLevels[7] = 3;
    PBLevels[8] = 3;
    PBLevels[9] = 4;
    PBLevels[10] = 4;
    PBLevels[11] = 4;
    PBLevels[12] = 4;
    PBLevels[13] = 5;
    PBLevels[14] = 5;
    PBLevels[15] = 5;
    PBLevels[16] = 5;
    PBLevels[17] = 6;
    PBLevels[18] = 6;
    PBLevels[19] = 6;
    PBLevels[20] = 6;
    PBLevels[21] = 7;
    PBLevels[22] = 7;
    PBLevels[23] = 7;
    PBLevels[24] = 7;
    PBLevels[25] = 8;
    PBLevels[26] = 8;
    PBLevels[27] = 8;
    PBLevels[28] = 8;
    PBLevels[29] = 9;
    PBLevels[30] = 9;
   


    return (
        <body onload="setupPage()" style="background-color:rgb(59, 56, 56);">
            <div style="font: small-caps 700 2em Libre Baskerville; color:rgb(255, 255, 255); text-align:center; margin:auto;">
                Encounter Adjustment Calculator
            </div>
            <br />
            <div
                id="leftCol"
                style="float:left; background-color: rgb(239, 184, 103); padding:10px;"
            >
                <div style="box-shadow: 0px 4px 5px black; background-color: rgb(248, 225, 190); display: block; padding:2px;">
                    <div style="font: small-caps 700 1.2em Libre Baskerville; color:rgb(88, 24, 13); text-align:center; margin:auto;">
                        Base Challenge Rating (optional)
                    </div>
                    <table style="width:420px; margin:auto;">
                        <tr style="height:30px;">
                            <td>
                                <button
                                    className="crButton"
                                    onClick={setBaseCR(0)}
                                >
                                    0
                                </button>
                            </td>
                            <td>
                                <button
                                    className="crButton"
                                    onClick={this.setBaseCR(1 / 8)}
                                >
                                    1/8
                                </button>
                            </td>
                            <td>
                                <button
                                    className="crButton"
                                    onClick={this.setBaseCR(1 / 4)}
                                >
                                    1/4
                                </button>
                            </td>
                            <td>
                                <button
                                    className="crButton"
                                    onClick={this.setBaseCR(1 / 2)}
                                >
                                    1/2
                                </button>
                            </td>
                        </tr>
                        <tr style="height:30px;">
                            <td>
                                <button
                                    className="crButton"
                                    onClick={this.setBaseCR(1)}
                                >
                                    1
                                </button>
                            </td>
                            <td>
                                <button
                                    className="crButton"
                                    onClick={this.setBaseCR(2)}
                                >
                                    2
                                </button>
                            </td>
                            <td>
                                <button
                                    className="crButton"
                                    onClick={this.setBaseCR(3)}
                                >
                                    3
                                </button>
                            </td>
                            <td>
                                <button
                                    className="crButton"
                                    onClick={this.setBaseCR(4)}
                                >
                                    4
                                </button>
                            </td>
                            <td>
                                <button
                                    className="crButton"
                                    onClick={this.setBaseCR(5)}
                                >
                                    5
                                </button>
                            </td>
                            <td>
                                <button
                                    className="crButton"
                                    onClick={this.setBaseCR(6)}
                                >
                                    6
                                </button>
                            </td>
                            <td>
                                <button
                                    className="crButton"
                                    onClick={this.setBaseCR(7)}
                                >
                                    7
                                </button>
                            </td>
                            <td>
                                <button
                                    className="crButton"
                                    onClick={this.setBaseCR(8)}
                                >
                                    8
                                </button>
                            </td>
                            <td>
                                <button
                                    className="crButton"
                                    onClick={this.setBaseCR(9)}
                                >
                                    9
                                </button>
                            </td>
                            <td>
                                <button
                                    className="crButton"
                                    onClick={this.setBaseCR(10)}
                                >
                                    10
                                </button>
                            </td>
                        </tr>
                        <tr style="height:30px;">
                            <td>
                                <button
                                    className="crButton"
                                    onClick={this.setBaseCR(11)}
                                >
                                    11
                                </button>
                            </td>
                            <td>
                                <button
                                    className="crButton"
                                    onClick={this.setBaseCR(12)}
                                >
                                    12
                                </button>
                            </td>
                            <td>
                                <button
                                    className="crButton"
                                    onClick={this.setBaseCR(13)}
                                >
                                    13
                                </button>
                            </td>
                            <td>
                                <button
                                    className="crButton"
                                    onClick={this.setBaseCR(14)}
                                >
                                    14
                                </button>
                            </td>
                            <td>
                                <button
                                    className="crButton"
                                    onClick={this.setBaseCR(15)}
                                >
                                    15
                                </button>
                            </td>
                            <td>
                                <button
                                    className="crButton"
                                    onClick={this.setBaseCR(16)}
                                >
                                    16
                                </button>
                            </td>
                            <td>
                                <button
                                    className="crButton"
                                    onClick={this.setBaseCR(17)}
                                >
                                    17
                                </button>
                            </td>
                            <td>
                                <button
                                    className="crButton"
                                    onClick={this.setBaseCR(18)}
                                >
                                    18
                                </button>
                            </td>
                            <td>
                                <button
                                    className="crButton"
                                    onClick={this.setBaseCR(19)}
                                >
                                    19
                                </button>
                            </td>
                            <td>
                                <button
                                    className="crButton"
                                    onClick={this.setBaseCR(20)}
                                >
                                    20
                                </button>
                            </td>
                        </tr>
                        <tr style="height:30px;">
                            <td>
                                <button
                                    className="crButton"
                                    onClick={this.setBaseCR(21)}
                                >
                                    21
                                </button>
                            </td>
                            <td>
                                <button
                                    className="crButton"
                                    onClick={this.setBaseCR(22)}
                                >
                                    22
                                </button>
                            </td>
                            <td>
                                <button
                                    className="crButton"
                                    onClick={this.setBaseCR(23)}
                                >
                                    23
                                </button>
                            </td>
                            <td>
                                <button
                                    className="crButton"
                                    onClick={this.setBaseCR(24)}
                                >
                                    24
                                </button>
                            </td>
                            <td>
                                <button
                                    className="crButton"
                                    onClick={this.setBaseCR(25)}
                                >
                                    25
                                </button>
                            </td>
                            <td>
                                <button
                                    className="crButton"
                                    onClick={this.setBaseCR(26)}
                                >
                                    26
                                </button>
                            </td>
                            <td>
                                <button
                                    className="crButton"
                                    onClick={this.setBaseCR(27)}
                                >
                                    27
                                </button>
                            </td>
                            <td>
                                <button
                                    className="crButton"
                                    onClick={this.setBaseCR(28)}
                                >
                                    28
                                </button>
                            </td>
                            <td>
                                <button
                                    className="crButton"
                                    onClick={this.setBaseCR(29)}
                                >
                                    29
                                </button>
                            </td>
                            <td>
                                <button
                                    className="crButton"
                                    onClick={this.setBaseCR(30)}
                                >
                                    30
                                </button>
                            </td>
                        </tr>
                    </table>
                </div>
                <br />
                {/*<!--Defensive CR: <span id="defensiveCRDisplay">Unknown</span> <br/>
        Offensive CR: <span id="offensiveCRDisplay">Unknown</span> <br/>
    <b>Total CR: <span id="totalCRDisplay">Unknown</span></b> -->*/}
                <div style="box-shadow: 0px 4px 5px black; background-color: rgb(248, 225, 190); display: block; padding:5px;">
                    <input
                        type="text"
                        id="monsterName"
                        placeholder="Monster Name"
                        className="monsterNameInput"
                    />
                    <button className="saveButton" onClick={this.saveMonster()}>
                        Add to ➨<br />
                        Encounter
                    </button>
                    <table>
                        <tr>
                            <td rowspan="2">
                                <img
                                    src="Skull.png"
                                    alt="UpArrow"
                                    width="40"
                                    height="40"
                                    style="vertical-align:middle;"
                                />
                            </td>
                            <td style="font: bold 0.8em Noto Sans; text-align:center; color:rgb(88, 24, 13);">
                                Challenge Rating (CR)
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <div style="margin: auto">
                                    <input
                                        style="float:left; box-shadow:0px 3px 5px 1px rgb(124, 104, 74) inset; border:none; background-color: rgb(243, 203, 145); font: bold 1em Noto Sans; text-align:center;"
                                        type="text"
                                        size="4"
                                        id="challengeRating"
                                        onChange={() => {
                                            totalCR = eval(this.value);
                                            this.recalcTotalCR();
                                        }}
                                    />
                                    <button
                                        className="plusButton"
                                        onClick={() => {
                                            var element =
                                                document.getElementById(
                                                    'challengeRating'
                                                );
                                            element.value = this.nextCR(
                                                eval(element.value),
                                                1
                                            );
                                            element.onChange();
                                        }}
                                    >
                                        +
                                    </button>
                                    <button
                                        className="plusButton"
                                        onClick={() => {
                                            var element =
                                                document.getElementById(
                                                    'challengeRating'
                                                );
                                            element.value = nextCR(
                                                eval(element.value),
                                                -1
                                            );
                                            element.onChange();
                                        }}
                                    >
                                        -
                                    </button>
                                </div>
                            </td>
                        </tr>
                        <tr>
                            <td rowspan="2">
                                <img
                                    src="Breastplate.png"
                                    alt="UpArrow"
                                    width="40"
                                    height="40"
                                    style="vertical-align:middle"
                                />
                            </td>
                            <td style="font: bold 0.8em Noto Sans; text-align:center; color:rgb(88, 24, 13);">
                                Armor Class (AC)
                            </td>
                            <td style="font: bold 0.8em Noto Sans; text-align:center; color:rgb(88, 24, 13);">
                                Hit Points (HP)
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <input
                                    style="float:left; box-shadow:0px 3px 5px 1px rgb(124, 104, 74) inset; border:none; background-color: rgb(243, 203, 145); font: bold 1em Noto Sans; text-align:center;"
                                    type="text"
                                    size="4"
                                    id="armorClass"
                                    onChange={() => {
                                        AC = parseInt(this.value);
                                        this.recalcTotalCR();
                                    }}
                                />
                                <button
                                    className="plusButton"
                                    onClick={this.addValue(
                                        document.getElementById('armorClass'),
                                        1
                                    )}
                                >
                                    +
                                </button>
                                <button
                                    className="plusButton"
                                    onClick={this.addValue(
                                        document.getElementById('armorClass'),
                                        -1
                                    )}
                                >
                                    -
                                </button>
                            </td>
                            <td>
                                <input
                                    style="float:left; box-shadow:0px 3px 5px 1px rgb(124, 104, 74) inset; border:none; background-color: rgb(243, 203, 145); font: bold 1em Noto Sans; text-align:center;"
                                    type="text"
                                    size="4"
                                    id="hitPoints"
                                    onChange={() => {
                                        HP = parseInt(this.value);
                                        this.recalcTotalCR();
                                    }}
                                />
                                <button
                                    className="plusButton"
                                    onClick={this.addValue(
                                        document.getElementById('hitPoints'),
                                        1
                                    )}
                                >
                                    +
                                </button>
                                <button
                                    className="plusButton"
                                    onClick={this.addValue(
                                        document.getElementById('hitPoints'),
                                        -1
                                    )}
                                >
                                    -
                                </button>
                            </td>
                        </tr>
                        <tr>
                            <td rowspan="2">
                                <img
                                    src="Sword.png"
                                    alt="UpArrow"
                                    width="40"
                                    height="40"
                                    style="vertical-align:middle"
                                />
                            </td>
                            <td style="font: bold 0.8em Noto Sans; text-align:center; color:rgb(88, 24, 13); padding: 0px;">
                                Attack Bonus
                            </td>
                            <td style="font: bold 0.8em Noto Sans; text-align:center; color:rgb(88, 24, 13); padding: 0px;">
                                Damage Per Round
                            </td>
                        </tr>
                        <tr>
                            <td style="font: bold 1em Noto Sans; text-align:center; padding: 0px;">
                                <span id="attackBonus"></span>
                            </td>
                            <td style="font: bold 1em Noto Sans; text-align:center; padding: 0px;">
                                <span id="damagePerRound"></span>
                            </td>
                        </tr>
                    </table>
                </div>
                <br />
                <div style="box-shadow: 0px 4px 5px black; background-color: rgb(248, 225, 190); display: block; padding:5px;">
                    <div style="font: small-caps 700 1.2em Libre Baskerville; color:rgb(88, 24, 13); text-align:center; margin:auto;">
                        Optional Monster Features
                    </div>
                    <table
                        id="monsterFeatTable"
                        style="font-size:x-small; width:420px; margin:auto;"
                    >
                        <tr>
                            <td>
                                <button
                                    className="featDisabled"
                                    onClick={this.setFeatureNEW(this)}
                                    value="Aggressive"
                                >
                                    Aggressive
                                </button>
                            </td>
                            <td>
                                <button
                                    className="featDisabled"
                                    onClick={this.setFeatureNEW(this)}
                                    value="Ambusher"
                                >
                                    Ambusher
                                </button>
                            </td>
                            <td>
                                <button
                                    className="featDisabled"
                                    onClick={this.setFeatureNEW(this)}
                                    value="Amorphous"
                                >
                                    Amorphous
                                </button>
                            </td>
                            <td>
                                <button
                                    className="featDisabled"
                                    onClick={this.setFeatureNEW(this)}
                                    value="Amphibious"
                                >
                                    Amphibious
                                </button>
                            </td>
                            <td>
                                <button
                                    className="featDisabled"
                                    onClick={this.setFeatureNEW(this)}
                                    value="Angelic Weapons"
                                >
                                    Angelic Weapons
                                </button>
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <button
                                    className="featDisabled"
                                    onClick={this.setFeatureNEW(this)}
                                    value="AntimagicSusceptibility"
                                >
                                    Antimagic Susceptibility
                                </button>
                            </td>
                            <td>
                                <button
                                    className="featDisabled"
                                    onClick={this.setFeatureNEW(this)}
                                    value="Avoidance"
                                >
                                    Avoidance
                                </button>
                            </td>
                            <td>
                                <button
                                    className="featDisabled"
                                    onClick={this.setFeatureNEW(this)}
                                    value="BlindSenses"
                                >
                                    Blind Senses
                                </button>
                            </td>
                            <td>
                                <button
                                    className="featDisabled"
                                    onClick={this.setFeatureNEW(this)}
                                    value="BloodFrenzy"
                                >
                                    Blood Frenzy
                                </button>
                            </td>
                            <td>
                                <button
                                    className="featDisabled"
                                    onClick={this.setFeatureNEW(this)}
                                    value="BreathWeapon"
                                >
                                    Breath Weapon
                                </button>
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <button
                                    className="featDisabled"
                                    onClick={this.setFeatureNEW(this)}
                                    value="Brute"
                                >
                                    Brute
                                </button>
                            </td>
                            <td>
                                <button
                                    className="featDisabled"
                                    onClick={this.setFeatureNEW(this)}
                                    value="Avoidance"
                                >
                                    Chameleon Skin
                                </button>
                            </td>
                            <td>
                                <button
                                    className="featDisabled"
                                    onClick={this.setFeatureNEW(this)}
                                    value="ChameleonSkin"
                                >
                                    Change Shape
                                </button>
                            </td>
                            <td>
                                <button
                                    className="featDisabled"
                                    onClick={this.setFeatureNEW(this)}
                                    value="Charge"
                                >
                                    Charge
                                </button>
                            </td>
                            <td>
                                <button
                                    className="featDisabled"
                                    onClick={this.setFeatureNEW(this)}
                                    value="Charm"
                                >
                                    Charm
                                </button>
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <button
                                    className="featDisabled"
                                    onClick={this.setFeatureNEW(this)}
                                    value="Constrict"
                                >
                                    Constrict
                                </button>
                            </td>
                            <td>
                                <button
                                    className="featDisabled"
                                    onClick={this.setFeatureNEW(this)}
                                    value="DamageAbsorption"
                                >
                                    Damage Absorption
                                </button>
                            </td>
                            <td>
                                <button
                                    className="featDisabled"
                                    onClick={this.setFeatureNEW(this)}
                                    value="DamageTransfer"
                                >
                                    Damage Transfer
                                </button>
                            </td>
                            <td>
                                <button
                                    className="featDisabled"
                                    onClick={this.setFeatureNEW(this)}
                                    value="DeathBurst"
                                >
                                    Death Burst
                                </button>
                            </td>
                            <td>
                                <button
                                    className="featDisabled"
                                    onClick={this.setFeatureNEW(this)}
                                    value="DevilSight"
                                >
                                    Devil Sight
                                </button>
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <button
                                    className="featDisabled"
                                    onClick={this.setFeatureNEW(this)}
                                    value="Dive"
                                >
                                    Dive
                                </button>
                            </td>
                            <td>
                                <button
                                    className="featDisabled"
                                    onClick={this.setFeatureNEW(this)}
                                    value="Echolocation"
                                >
                                    Echolocation
                                </button>
                            </td>
                            <td>
                                <button
                                    className="featDisabled"
                                    onClick={this.setFeatureNEW(this)}
                                    value="ElementalBody"
                                >
                                    Elemental Body
                                </button>
                            </td>
                            <td>
                                <button
                                    className="featDisabled"
                                    onClick={this.setFeatureNEW(this)}
                                    value="Enlarge"
                                >
                                    Enlarge
                                </button>
                            </td>
                            <td>
                                <button
                                    className="featDisabled"
                                    onClick={this.setFeatureNEW(this)}
                                    value="Etherealness"
                                >
                                    Etherealness
                                </button>
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <button
                                    className="featDisabled"
                                    onClick={this.setFeatureNEW(this)}
                                    value="False Appearance"
                                >
                                    False Appearance
                                </button>
                            </td>
                            <td>
                                <button
                                    className="featDisabled"
                                    onClick={this.setFeatureNEW(this)}
                                    value="FeyAncestry"
                                >
                                    Fey Ancestry
                                </button>
                            </td>
                            <td>
                                <button
                                    className="featDisabled"
                                    onClick={this.setFeatureNEW(this)}
                                    value="FiendishBlessing"
                                >
                                    Fiendish Blessing
                                </button>
                            </td>
                            <td>
                                <button
                                    className="featDisabled"
                                    onClick={this.setFeatureNEW(this)}
                                    value="Flyby"
                                >
                                    Flyby
                                </button>
                            </td>
                            <td>
                                <button
                                    className="featDisabled"
                                    onClick={this.setFeatureNEW(this)}
                                    value="FrightfulPresence"
                                >
                                    Frightful Presence
                                </button>
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <button
                                    className="featDisabled"
                                    onClick={this.setFeatureNEW(this)}
                                    value="Grappler"
                                >
                                    Grappler
                                </button>
                            </td>
                            <td>
                                <button
                                    className="featDisabled"
                                    onClick={this.setFeatureNEW(this)}
                                    value="HoldBreath"
                                >
                                    Hold Breath
                                </button>
                            </td>
                            <td>
                                <button
                                    className="featDisabled"
                                    onClick={this.setFeatureNEW(this)}
                                    value="HorrifyingVisage"
                                >
                                    Horrifying Visage
                                </button>
                            </td>
                            <td>
                                <button
                                    className="featDisabled"
                                    onClick={this.setFeatureNEW(this)}
                                    value="Illumination"
                                >
                                    Illumination
                                </button>
                            </td>
                            <td>
                                <button
                                    className="featDisabled"
                                    onClick={this.setFeatureNEW(this)}
                                    value="IllusoryAppearance"
                                >
                                    Illusory Appearance
                                </button>
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <button
                                    className="featDisabled"
                                    onClick={this.setFeatureNEW(this)}
                                    value="ImmutableForm"
                                >
                                    Immutable Form
                                </button>
                            </td>
                            <td>
                                <button
                                    className="featDisabled"
                                    onClick={this.setFeatureNEW(this)}
                                    value="IncorporealMovement"
                                >
                                    Incorporeal Movement
                                </button>
                            </td>
                            <td>
                                <button
                                    className="featDisabled"
                                    onClick={this.setFeatureNEW(this)}
                                    value="InnateSpellcasting"
                                >
                                    Innate Spellcasting
                                </button>
                            </td>
                            <td>
                                <button
                                    className="featDisabled"
                                    onClick={this.setFeatureNEW(this)}
                                    value="Inscrutable"
                                >
                                    Inscrutable
                                </button>
                            </td>
                            <td>
                                <button
                                    className="featDisabled"
                                    onClick={this.setFeatureNEW(this)}
                                    value="Invisibility"
                                >
                                    Invisibility
                                </button>
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <button
                                    className="featDisabled"
                                    onClick={this.setFeatureNEW(this)}
                                    value="KeenSenses"
                                >
                                    Keen Senses
                                </button>
                            </td>
                            <td>
                                <button
                                    className="featDisabled"
                                    onClick={this.setFeatureNEW(this)}
                                    value="LabrynthineRecall"
                                >
                                    Labrynthine Recall
                                </button>
                            </td>
                            <td>
                                <button
                                    className="featDisabled"
                                    onClick={this.setFeatureNEW(this)}
                                    value="Leadership"
                                >
                                    Leadership
                                </button>
                            </td>
                            <td>
                                <button
                                    className="featDisabled"
                                    onClick={this.setFeatureNEW(this)}
                                    value="LegendaryResistance"
                                >
                                    Legendary Resistance
                                </button>
                            </td>
                            <td>
                                <button
                                    className="featDisabled"
                                    onClick={this.setFeatureNEW(this)}
                                    value="LifeDrain"
                                >
                                    Life Drain
                                </button>
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <button
                                    className="featDisabled"
                                    onClick={this.setFeatureNEW(this)}
                                    value="LightSensitivity"
                                >
                                    Light Sensitivity
                                </button>
                            </td>
                            <td>
                                <button
                                    className="featDisabled"
                                    onClick={this.setFeatureNEW(this)}
                                    value="MagicResistance"
                                >
                                    Magic Resistance
                                </button>
                            </td>
                            <td>
                                <button
                                    className="featDisabled"
                                    onClick={this.setFeatureNEW(this)}
                                    value="MagicWeapons"
                                >
                                    Magic Weapons
                                </button>
                            </td>
                            <td>
                                <button
                                    className="featDisabled"
                                    onClick={this.setFeatureNEW(this)}
                                    value="MartialAdvantage"
                                >
                                    Martial Advantage
                                </button>
                            </td>
                            <td>
                                <button
                                    className="featDisabled"
                                    onClick={this.setFeatureNEW(this)}
                                    value="Mimicry"
                                >
                                    Mimicry
                                </button>
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <button
                                    className="featDisabled"
                                    onClick={this.setFeatureNEW(this)}
                                    value="NimbleEscape"
                                >
                                    Nimble Escape
                                </button>
                            </td>
                            <td>
                                <button
                                    className="featDisabled"
                                    onClick={this.setFeatureNEW(this)}
                                    value="OtherworldlyPerception"
                                >
                                    Otherworldly Perception
                                </button>
                            </td>
                            <td>
                                <button
                                    className="featDisabled"
                                    onClick={this.setFeatureNEW(this)}
                                    value="PackTactics"
                                >
                                    Pack Tactics
                                </button>
                            </td>
                            <td>
                                <button
                                    className="featDisabled"
                                    onClick={this.setFeatureNEW(this)}
                                    value="Parry"
                                >
                                    Parry
                                </button>
                            </td>
                            <td>
                                <button
                                    className="featDisabled"
                                    onClick={this.setFeatureNEW(this)}
                                    value="Possession"
                                >
                                    Possession
                                </button>
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <button
                                    className="featDisabled"
                                    onClick={this.setFeatureNEW(this)}
                                    value="Pounce"
                                >
                                    Pounce
                                </button>
                            </td>
                            <td>
                                <button
                                    className="featDisabled"
                                    onClick={this.setFeatureNEW(this)}
                                    value="PsychicDefense"
                                >
                                    Psychic Defense
                                </button>
                            </td>
                            <td>
                                <button
                                    className="featDisabled"
                                    onClick={this.setFeatureNEW(this)}
                                    value="Rampage"
                                >
                                    Rampage
                                </button>
                            </td>
                            <td>
                                <button
                                    className="featDisabled"
                                    onClick={this.setFeatureNEW(this)}
                                    value="Reactive"
                                >
                                    Reactive
                                </button>
                            </td>
                            <td>
                                <button
                                    className="featDisabled"
                                    onClick={this.setFeatureNEW(this)}
                                    value="ReadThoughts"
                                >
                                    Read Thoughts
                                </button>
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <button
                                    className="featDisabled"
                                    onClick={this.setFeatureNEW(this)}
                                    value="Reckless"
                                >
                                    Reckless
                                </button>
                            </td>
                            <td>
                                <button
                                    className="featDisabled"
                                    onClick={this.setFeatureNEW(this)}
                                    value="RedirectAttack"
                                >
                                    Redirect Attack
                                </button>
                            </td>
                            <td>
                                <button
                                    className="featDisabled"
                                    onClick={this.setFeatureNEW(this)}
                                    value="Reel"
                                >
                                    Reel
                                </button>
                            </td>
                            <td>
                                <button
                                    className="featDisabled"
                                    onClick={this.setFeatureNEW(this)}
                                    value="Regeneration"
                                >
                                    Regeneration
                                </button>
                            </td>
                            <td>
                                <button
                                    className="featDisabled"
                                    onClick={this.setFeatureNEW(this)}
                                    value="Rejuvenation"
                                >
                                    Rejuvenation
                                </button>
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <button
                                    className="featDisabled"
                                    onClick={this.setFeatureNEW(this)}
                                    value="Relentless"
                                >
                                    Relentless
                                </button>
                            </td>
                            <td>
                                <button
                                    className="featDisabled"
                                    onClick={this.setFeatureNEW(this)}
                                    value="ShadowStealth"
                                >
                                    Shadow Stealth
                                </button>
                            </td>
                            <td>
                                <button
                                    className="featDisabled"
                                    onClick={this.setFeatureNEW(this)}
                                    value="ShapeChanger"
                                >
                                    Shape Changer
                                </button>
                            </td>
                            <td>
                                <button
                                    className="featDisabled"
                                    onClick={this.setFeatureNEW(this)}
                                    value="SiegeMonster"
                                >
                                    Siege Monster
                                </button>
                            </td>
                            <td>
                                <button
                                    className="featDisabled"
                                    onClick={this.setFeatureNEW(this)}
                                    value="Slippery"
                                >
                                    Slippery
                                </button>
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <button
                                    className="featDisabled"
                                    onClick={this.setFeatureNEW(this)}
                                    value="Spellcasting"
                                >
                                    Spellcasting
                                </button>
                            </td>
                            <td>
                                <button
                                    className="featDisabled"
                                    onClick={this.setFeatureNEW(this)}
                                    value="SpiderClimb"
                                >
                                    Spider Climb
                                </button>
                            </td>
                            <td>
                                <button
                                    className="featDisabled"
                                    onClick={this.setFeatureNEW(this)}
                                    value="StandingLeap"
                                >
                                    Standing Leap
                                </button>
                            </td>
                            <td>
                                <button
                                    className="featDisabled"
                                    onClick={this.setFeatureNEW(this)}
                                    value="Steadfast"
                                >
                                    Steadfast
                                </button>
                            </td>
                            <td>
                                <button
                                    className="featDisabled"
                                    onClick={this.setFeatureNEW(this)}
                                    value="Stench"
                                >
                                    Stench
                                </button>
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <button
                                    className="featDisabled"
                                    onClick={this.setFeatureNEW(this)}
                                    value="SunlightSensitivity"
                                >
                                    Sunlight Sensitivity
                                </button>
                            </td>
                            <td>
                                <button
                                    className="featDisabled"
                                    onClick={this.setFeatureNEW(this)}
                                    value="SuperiorInvisibility"
                                >
                                    Superior Invisibility
                                </button>
                            </td>
                            <td>
                                <button
                                    className="featDisabled"
                                    onClick={this.setFeatureNEW(this)}
                                    value="SureFooted"
                                >
                                    Sure-Footed
                                </button>
                            </td>
                            <td>
                                <button
                                    className="featDisabled"
                                    onClick={this.setFeatureNEW(this)}
                                    value="SurpriseAttack"
                                >
                                    Surprise Attack
                                </button>
                            </td>
                            <td>
                                <button
                                    className="featDisabled"
                                    onClick={this.setFeatureNEW(this)}
                                    value="Swallow"
                                >
                                    Swallow
                                </button>
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <button
                                    className="featDisabled"
                                    onClick={this.setFeatureNEW(this)}
                                    value="Teleport"
                                >
                                    Teleport
                                </button>
                            </td>
                            <td>
                                <button
                                    className="featDisabled"
                                    onClick={this.setFeatureNEW(this)}
                                    value="TerrainCamoflage"
                                >
                                    Terrain Camoflage
                                </button>
                            </td>
                            <td>
                                <button
                                    className="featDisabled"
                                    onClick={this.setFeatureNEW(this)}
                                    value="Tunneler"
                                >
                                    Tunneler
                                </button>
                            </td>
                            <td>
                                <button
                                    className="featDisabled"
                                    onClick={this.setFeatureNEW(this)}
                                    value="TurnImmunity"
                                >
                                    Turn Immunity
                                </button>
                            </td>
                            <td>
                                <button
                                    className="featDisabled"
                                    onClick={this.setFeatureNEW(this)}
                                    value="TurnResistance"
                                >
                                    Turn Resistance
                                </button>
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <button
                                    className="featDisabled"
                                    onClick={this.setFeatureNEW(this)}
                                    value="TwoHeads"
                                >
                                    Two Heads
                                </button>
                            </td>
                            <td>
                                <button
                                    className="featDisabled"
                                    onClick={this.setFeatureNEW(this)}
                                    value="UndeadFortitude"
                                >
                                    Undead Fortitude
                                </button>
                            </td>
                            <td>
                                <button
                                    className="featDisabled"
                                    onClick={this.setFeatureNEW(this)}
                                    value="Web"
                                >
                                    Web
                                </button>
                            </td>
                            <td>
                                <button
                                    className="featDisabled"
                                    onClick={this.setFeatureNEW(this)}
                                    value="WebSense"
                                >
                                    Web Sense
                                </button>
                            </td>
                            <td>
                                <button
                                    className="featDisabled"
                                    onClick={this.setFeatureNEW(this)}
                                    value="WebWalker"
                                >
                                    Web Walker
                                </button>
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <button
                                    className="featDisabled"
                                    onClick={this.setFeatureNEW(this)}
                                    value="WoundedFury"
                                >
                                    Wounded Fury
                                </button>
                            </td>
                        </tr>
                    </table>
                </div>
            </div>
            <div style="float:left; width:15px; color:rgb(59, 56, 56);">x</div>
            <div id="rightCol" style="float:left;">
                <div style="background-color: rgb(239, 184, 103); padding:10px;">
                    <div style="box-shadow: 0px 4px 5px black; background-color: rgb(248, 225, 190); display: block; padding:2px;">
                        <div style="font: small-caps 700 1.2em Libre Baskerville; color:rgb(88, 24, 13); text-align:center; margin:auto;">
                            Party Members
                        </div>
                        <table id="partyList" style="width:100%;">
                            <tr>
                                <td style="font: bold 0.8em Noto Sans; text-align:center; color:rgb(88, 24, 13);">
                                    Number of Players
                                </td>
                                <td style="font: bold 0.8em Noto Sans; text-align:center; color:rgb(88, 24, 13);">
                                    Player Level
                                </td>
                                <td>
                                    <button
                                        className="partyButton"
                                        onClick={this.addPartyRow()}
                                    >
                                        Add row
                                    </button>
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <input
                                        style="float:left; box-shadow:0px 3px 5px 1px rgb(124, 104, 74) inset; border:none; background-color: rgb(243, 203, 145); font: bold 1em Noto Sans; text-align:center;"
                                        type="text"
                                        id="partySize"
                                        size="10"
                                        onChange={this.calculatePartyThresholds()}
                                    />
                                </td>
                                <td>
                                    <input
                                        style="float:left; box-shadow:0px 3px 5px 1px rgb(124, 104, 74) inset; border:none; background-color: rgb(243, 203, 145); font: bold 1em Noto Sans; text-align:center;"
                                        type="text"
                                        id="partyLevel"
                                        size="10"
                                        onChange={this.calculatePartyThresholds()}
                                    />
                                </td>
                            </tr>
                        </table>
                    </div>
                    <br />
                    <div style="box-shadow: 0px 4px 5px black; background-color: rgb(248, 225, 190); display: block; padding:5px;">
                        <div style="font: small-caps 700 1.2em Libre Baskerville; color:rgb(88, 24, 13); text-align:center; margin:auto;">
                            XP Difficulty Thresholds
                        </div>
                        <table
                            width="300px"
                            style="text-align:center; margin:auto;"
                        >
                            <tr>
                                <td
                                    style="font: bold 0.8em Noto Sans; text-align:center; color:rgb(88, 24, 13);"
                                    width="25%"
                                >
                                    <b>
                                        <u>Easy</u>
                                    </b>
                                </td>
                                <td
                                    style="font: bold 0.8em Noto Sans; text-align:center; color:rgb(88, 24, 13);"
                                    width="25%"
                                >
                                    <b>
                                        <u>Medium</u>
                                    </b>
                                </td>
                                <td
                                    style="font: bold 0.8em Noto Sans; text-align:center; color:rgb(88, 24, 13);"
                                    width="25%"
                                >
                                    <b>
                                        <u>Hard</u>
                                    </b>
                                </td>
                                <td
                                    style="font: bold 0.8em Noto Sans; text-align:center; color:rgb(88, 24, 13);"
                                    width="25%"
                                >
                                    <b>
                                        <u>Deadly</u>
                                    </b>
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <span id="easyThreshold"></span>
                                </td>
                                <td>
                                    <span id="mediumThreshold"></span>
                                </td>
                                <td>
                                    <span id="hardThreshold"></span>
                                </td>
                                <td>
                                    <span id="deadlyThreshold"></span>
                                </td>
                            </tr>
                        </table>
                        <div style="font: small-caps 700 1.2em Libre Baskerville; color:rgb(88, 24, 13); text-align:center; margin:auto;">
                            Adjust to Desired Difficulty
                        </div>
                        <div style="font: bold 0.8em Noto Sans; text-align:center; color:rgb(88, 24, 13);">
                            Add at least one monster to the encounter
                        </div>
                        <div style="margin:auto; display:block; text-align:center;">
                            <button
                                id="easyButton"
                                onClick={this.adjustEncounter('Easy')}
                            >
                                Easy
                            </button>
                            <button
                                id="mediumButton"
                                onClick={this.adjustEncounter('Medium')}
                            >
                                Medium
                            </button>
                            <button
                                id="hardButton"
                                onClick={this.adjustEncounter('Hard')}
                            >
                                Hard
                            </button>
                            <button
                                id="deadlyButton"
                                onClick={this.adjustEncounter('Deadly')}
                            >
                                Deadly
                            </button>
                        </div>
                        <table
                            width="300px"
                            style="text-align:center; margin:auto;"
                        >
                            <tr>
                                <td style="font: bold 0.8em Noto Sans; text-align:center; color:rgb(88, 24, 13);">
                                    <u>Original:</u>
                                </td>
                                <td style="font: bold 0.8em Noto Sans; text-align:center; color:rgb(88, 24, 13);">
                                    <u>Adjusted:</u>
                                </td>
                                <td style="font: bold 0.8em Noto Sans; text-align:center; color:rgb(88, 24, 13);">
                                    <u>Reward:</u>
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <span id="encounterDifficulty">0</span> XP
                                </td>
                                <td>
                                    <span id="adjustedDifficulty">0</span> XP
                                </td>
                                <td>
                                    <span id="rewardDifficulty">0</span> XP
                                </td>
                            </tr>
                        </table>
                    </div>
                </div>
                <br />
                <div style="background-color: rgb(239, 184, 103); padding:10px;">
                    <div style="box-shadow: 0px 4px 5px black; background-color: rgb(248, 225, 190); display: block; padding:2px;">
                        <div style="font: small-caps 700 1.2em Libre Baskerville; color:rgb(88, 24, 13); text-align:center; margin:auto;">
                            Encounter List
                        </div>
                    </div>
                    <table id="monsterList"></table>
                </div>
            </div>
            <script src="./functionality.js" />
        </body>
    );
};

export default Suggestor;
