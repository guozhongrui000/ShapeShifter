import {
  Component, Input, OnInit, ChangeDetectorRef,
  OnDestroy, NgZone, OnChanges
} from '@angular/core';
import { VectorLayer, PathLayer } from '../scripts/layers';
import { PathCommand, SubPathCommand, Command } from '../scripts/commands';
import { CanvasType } from '../CanvasType';
import { LayerStateService } from '../services/layerstate.service';
import { Subscription } from 'rxjs/Subscription';
import { InspectorService, EventType, InspectorEvent } from '../services/inspector.service';
import { AutoAwesome } from '../scripts/common';

@Component({
  selector: 'app-inspector',
  templateUrl: './inspector.component.html',
  styleUrls: ['./inspector.component.scss'],
})
export class InspectorComponent implements OnInit, OnDestroy {
  START_CANVAS = CanvasType.Start;
  END_CANVAS = CanvasType.End;

  // TODO: possible for # of subpaths to change?
  private readonly collapsedSubPathIndices: Set<number> = new Set();
  private readonly subscriptions: Subscription[] = [];

  constructor(
    private layerStateService: LayerStateService,
    private inspectorService: InspectorService) { }

  ngOnInit() {
    this.subscriptions.push(this.inspectorService.addListener((event: InspectorEvent) => {
      const {source, eventType, subIdx, cmdIdx} = event;
      const fromPathLayer = this.layerStateService.getActivePathLayer(source);
      const toCanvasType =
        source === CanvasType.End
          ? CanvasType.Start
          : CanvasType.End;
      switch (eventType) {
        case EventType.AutoFix: {
          const toPathLayer = this.layerStateService.getActivePathLayer(toCanvasType);
          const autoFixResult =
            AutoAwesome.fixAll(subIdx, fromPathLayer.pathData, toPathLayer.pathData);
          fromPathLayer.pathData = autoFixResult.from;
          toPathLayer.pathData = autoFixResult.to;
          this.layerStateService.notifyChange(CanvasType.Start);
          this.layerStateService.notifyChange(CanvasType.End);
          // TODO: update selections
        }
          break;
        case EventType.Convert: {
          const toPathLayer = this.layerStateService.getActivePathLayer(toCanvasType);
          const targetSvgChar =
            toPathLayer.pathData.subPathCommands[subIdx].commands[cmdIdx].svgChar;
          fromPathLayer.pathData =
            fromPathLayer.pathData.convert(subIdx, cmdIdx, targetSvgChar);
          // TODO: update selections
        }
          break;
        case EventType.Reverse:
          fromPathLayer.pathData = fromPathLayer.pathData.reverse(subIdx);
          const numCommands = fromPathLayer.pathData.subPathCommands[subIdx].commands.length;
          // TODO: update selections
          break;
        case EventType.ShiftBack:
          fromPathLayer.pathData = fromPathLayer.pathData.shiftBack(subIdx);
          // TODO: update selections
          break;
        case EventType.ShiftForward:
          fromPathLayer.pathData = fromPathLayer.pathData.shiftForward(subIdx);
          // TODO: update selections
          break;
        case EventType.Split:
          fromPathLayer.pathData = fromPathLayer.pathData.splitInHalf(subIdx, cmdIdx);
          // TODO: update selections
          break;
        case EventType.Unsplit:
          fromPathLayer.pathData = fromPathLayer.pathData.unsplit(subIdx, cmdIdx);
          // TODO: update selections
          break;
      }
      this.layerStateService.notifyChange(source);
    }));
  }

  ngOnDestroy() {
    this.subscriptions.forEach(s => s.unsubscribe());
  }

  getSubPathCommands(canvasType: CanvasType) {
    const pathLayer = this.layerStateService.getActivePathLayer(canvasType);
    return pathLayer ? pathLayer.pathData.subPathCommands : [];
  }

  private getPathCommand(canvasType: CanvasType) {
    const vectorLayer = this.layerStateService.getVectorLayer(canvasType);
    const pathId = this.layerStateService.getActivePathId(canvasType);
    return (vectorLayer.findLayerById(pathId) as PathLayer).pathData;
  }

  getCommandWrappers(canvasType: CanvasType, subIdx: number) {
    const cws: CommandWrapper[] = [];
    const pathCommand = this.getPathCommand(canvasType);
    pathCommand.subPathCommands[subIdx].commands.forEach((command, cmdIdx) => {
      const id = pathCommand.getId(subIdx, cmdIdx);
      cws.push({ id, command });
    });
    return cws;
  }

  toggleExpandedState(subIdx: number) {
    if (this.collapsedSubPathIndices.has(subIdx)) {
      this.collapsedSubPathIndices.delete(subIdx);
    } else {
      this.collapsedSubPathIndices.add(subIdx);
    }
  }

  isExpanded(subIdx: number) {
    return !this.collapsedSubPathIndices.has(subIdx);
  }

  trackSubPathCommand(index: number, item: SubPathCommand) {
    // TODO: will need to change this if/when we support reordering subpaths
    return index;
  }

  trackCommand(index: number, item: CommandWrapper) {
    return item.id;
  }
}

interface CommandWrapper {
  id: string;
  command: Command;
}
