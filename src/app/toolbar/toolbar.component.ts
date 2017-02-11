import { Component, OnInit, ViewContainerRef } from '@angular/core';
import {
  LayerStateService, MorphabilityStatus, Event as LayerStateEvent
} from '../services/layerstate.service';
import { CanvasType } from '../CanvasType';
import { AvdSerializer } from '../scripts/parsers';
import * as $ from 'jquery';
import { AnimationTarget } from '../scripts/animation';
import { DialogsService } from '../dialogs';

@Component({
  selector: 'app-toolbar',
  templateUrl: './toolbar.component.html',
  styleUrls: ['./toolbar.component.scss']
})
export class ToolbarComponent implements OnInit {
  isMorphable = false;

  constructor(
    private viewContainerRef: ViewContainerRef,
    private layerStateService: LayerStateService,
    private dialogsService: DialogsService) { }

  ngOnInit() {
    this.layerStateService.addListener(CanvasType.Start, (event: LayerStateEvent) => {
      this.isMorphable = event.morphabilityStatus === MorphabilityStatus.Morphable;
    });
    this.layerStateService.addListener(CanvasType.End, (event: LayerStateEvent) => {
      this.isMorphable = event.morphabilityStatus === MorphabilityStatus.Morphable;
    });
  }

  onNewClick() {
    this.dialogsService
      .confirm('Start from scratch?', 'You\'ll lose any unsaved changes.', this.viewContainerRef)
      .subscribe(res => console.log(res));
  }

  onExportClick() {
    const startVectorLayer = this.layerStateService.getVectorLayer(CanvasType.Start);
    const startLayer = this.layerStateService.getActivePathLayer(CanvasType.Start);
    const fromValue = startLayer.pathData.pathString;
    const endLayer = this.layerStateService.getActivePathLayer(CanvasType.End);
    const toValue = endLayer.pathData.pathString;
    const xmlStr = AvdSerializer.vectorLayerAnimationToAvdXmlString(startVectorLayer,
      new AnimationTarget(
        startLayer.id,
        fromValue,
        toValue,
      ));
    this.downloadFile(xmlStr, `ShapeShifterAvd.xml`);
  }

  private downloadFile(content: string, filename: string) {
    const blob = new Blob([content], { type: 'octet/stream' });
    const url = window.URL.createObjectURL(blob);
    const anchor = $('<a>').hide().appendTo(document.body);
    anchor.attr({ href: url, download: filename });
    anchor.get(0).click();
    window.URL.revokeObjectURL(url);
  }
}
