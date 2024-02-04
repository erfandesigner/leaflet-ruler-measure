"use strict";
var _leaflet = _interopRequireDefault(require("leaflet"));

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : {
    default: obj
  };
}
_leaflet.default.Control.Ruler = _leaflet.default.Control.extend({
  options: {
    position: "topright",
    measureArea: true,
    circleMarker: {
      color: "red",
      radius: 2
    },
    lineStyle: {
      color: "red",
      dashArray: "1,6"
    },
    polyStyle: {
      stroke: false,
      fillColor: "red",
      fillOpacity: 0.05
    },
    lengthUnit: {
      display: "м",
      decimal: 0,
      factor: 1000,
      label: "فاصله:"
    },
    areaUnit: {
      display: "مترمربع",
      decimal: 0,
      factor: 1,
      label: "مساحت:"
    },
    angleUnit: {
      display: "&deg;",
      decimal: 2,
      factor: null,
      label: "درجه:"
    }
  },
  onAdd: function onAdd(map) {
    this._map = map;
    // this.main_container = _leaflet.default.DomUtil.create("div", "leaflet-ruler leaflet-control-layers leaflet-control");
    this._container = _leaflet.default.DomUtil.create("div", "leaflet-ruler leaflet-control-layers leaflet-control leaflet-control-ruler leaflet-touch leaflet-bar");
    this._container.classList.add("leaflet-control-ruler__btn");
    this._container.title = "فاصله، مساحت، درجه ";
    _leaflet.default.DomEvent.disableClickPropagation(this._container);
    _leaflet.default.DomEvent.on(this._container, "click", this._toggleMeasure, this);
    this._active = false;
    this._defaultCursor = this._map._container.style.cursor;
    this._allLayers = _leaflet.default.layerGroup();
    return this._container;
  },
  onRemove: function onRemove() {
    _leaflet.default.DomEvent.off(this._container, "click", this._toggleMeasure, this);
  },
  _toggleMeasure: function _toggleMeasure() {
    this._active = !this._active;
    this._clickedLatLong = null;
    this._clickedPoints = [];
    this._totalLength = 0;
    console.log(this._active)
    if (this._active) {
      window.document.dispatchEvent(new Event("mapRulerOn"));
      this._map.doubleClickZoom.disable();
      _leaflet.default.DomEvent.on(this._map._container, "keydown", this._escape, this);
      _leaflet.default.DomEvent.on(this._map._container, "dblclick", this._closePath, this);
      _leaflet.default.DomEvent.on(this._map._container, "contextmenu", this._closePath, this);
      this._container.classList.add("active");
      this._clickCount = 0;
      this._tempLine = _leaflet.default.featureGroup().addTo(this._allLayers);
      this._tempPoint = _leaflet.default.featureGroup().addTo(this._allLayers);
      this._pointLayer = _leaflet.default.featureGroup().addTo(this._allLayers);
      this._polylineLayer = _leaflet.default.featureGroup().addTo(this._allLayers);
      this._allLayers.addTo(this._map);
      this._map._container.style.cursor = "crosshair";
      this._map.on("click", this._clicked, this);
      this._map.on("mousemove", this._moving, this);
      _leaflet.default.DomEvent.on(window.document, "turnOffMapRuler", this._toggleMeasure, this);
    }
    if (!this._active) {
      window.document.dispatchEvent(new Event("mapRulerOff"));
      this._map.doubleClickZoom.enable();
      _leaflet.default.DomEvent.off(this._map._container, "keydown", this._escape, this);
      _leaflet.default.DomEvent.off(this._map._container, "dblclick", this._closePath, this);
      _leaflet.default.DomEvent.off(this._map._container, "contextmenu", this._closePath, this);
      this._container.classList.remove("active");
      this._map.removeLayer(this._allLayers);
      this._allLayers = _leaflet.default.layerGroup();
      this._map._container.style.cursor = this._defaultCursor;
      this._map.off("click", this._clicked, this);
      this._map.off("mousemove", this._moving, this);
      _leaflet.default.DomEvent.off(window.document, "turnOffMapRuler", this._toggleMeasure, this);
    }
  },
  _clicked: function _clicked(e) {
    if (!this._clickCount) {
      this._map.scrollWheelZoom.disable();
      this._map.zoomControl.disable();
    }
    this._clickedLatLong = e.latlng;
    this._clickedPoints.push(this._clickedLatLong);
    if (!this._clickCount || e.latlng.equals(this._clickedPoints[this._clickedPoints.length - 2])) {
      _leaflet.default.circleMarker(this._clickedLatLong, this.options.circleMarker).addTo(this._pointLayer);
    } else {
      if (this._movingLatLong) {
        _leaflet.default.polyline([this._clickedPoints[this._clickCount - 1], this._movingLatLong], this.options.lineStyle).addTo(this._polylineLayer);
      }
      this._totalLength += this._result.Distance;
      let text = "<b>".concat(this._totalLength.toLocaleString("fa-IR", {
        maximumFractionDigits: this.options.lengthUnit.decimal
      }), "</b>");
      _leaflet.default.circleMarker(this._clickedLatLong, this.options.circleMarker).bindTooltip(text, {
        permanent: true,
        direction: "top",
        className: "leaflet-ruler__result-tooltip"
      }).addTo(this._pointLayer).openTooltip();
    }
    this._clickCount++;
  },
  _moving: function _moving(e) {
    if (this._clickedLatLong) {
      _leaflet.default.DomEvent.off(this._container, "click", this._toggleMeasure, this);
      _leaflet.default.DomEvent.on(this._container, "click", this._closePathAndToggleMeasure, this);
      this._movingLatLong = e.latlng;
      if (this._tempLine) {
        this._map.removeLayer(this._tempLine);
        this._map.removeLayer(this._tempPoint);
      }
      let text;
      this._addedLength = 0;
      this._tempLine = _leaflet.default.featureGroup();
      this._tempPoint = _leaflet.default.featureGroup();
      this._tempLine.addTo(this._map);
      this._tempPoint.addTo(this._map);
      this._calculateBearingAndDistance();
      this._addedLength = this._result.Distance + this._totalLength;
      _leaflet.default.polyline([this._clickedLatLong, this._movingLatLong], this.options.lineStyle).addTo(this._tempLine);
      if (this._clickCount > 1) {
        text = "<b>".concat(this.options.angleUnit.label, "</b>&nbsp;").concat(this._result.Bearing.toFixed(this.options.angleUnit.decimal)).concat(this.options.angleUnit.display, "<br><b>").concat(this.options.lengthUnit.label, "</b>&nbsp;").concat(this._addedLength.toLocaleString("fa-IR", {
          maximumFractionDigits: this.options.lengthUnit.decimal
        })).concat(this.options.lengthUnit.display, "&nbsp;(+").concat(this._result.Distance.toLocaleString("fa-IR", {
          maximumFractionDigits: this.options.lengthUnit.decimal
        }), ")");
      } else {
        text = "<b>".concat(this.options.angleUnit.label, "</b>&nbsp;").concat(this._result.Bearing.toFixed(this.options.angleUnit.decimal)).concat(this.options.angleUnit.display, "<br><b>").concat(this.options.lengthUnit.label, "</b>&nbsp;").concat(this._result.Distance.toLocaleString("fa-IR", {
          maximumFractionDigits: this.options.lengthUnit.decimal
        })).concat(this.options.lengthUnit.display);
      }
      _leaflet.default.circleMarker(this._movingLatLong, this.options.circleMarker).bindTooltip(text, {
        sticky: true,
        direction: "top",
        className: "leaflet-ruler__moving-tooltip"
      }).addTo(this._tempPoint).openTooltip();
    }
  },
  _escape: function _escape(e) {
    if (e.keyCode === 27) {
      if (this._clickCount > 0) {
        this._closePath();
      } else {
        this._active = true;
        this._toggleMeasure();
      }
    }
  },
  _calculateBearingAndDistance: function _calculateBearingAndDistance() {
    let f1 = this._clickedLatLong.lat;
    let l1 = this._clickedLatLong.lng;
    let f2 = this._movingLatLong.lat;
    let l2 = this._movingLatLong.lng;
    let toRadian = Math.PI / 180;
    let y = Math.sin((l2 - l1) * toRadian) * Math.cos(f2 * toRadian);
    let x = Math.cos(f1 * toRadian) * Math.sin(f2 * toRadian) - Math.sin(f1 * toRadian) * Math.cos(f2 * toRadian) * Math.cos((l2 - l1) * toRadian);
    let brng = Math.atan2(y, x) * ((this.options.angleUnit.factor ? this.options.angleUnit.factor / 2 : 180) / Math.PI);
    brng += brng < 0 ? this.options.angleUnit.factor ? this.options.angleUnit.factor : 360 : 0;
    let R = this.options.lengthUnit.factor ? 6371 * this.options.lengthUnit.factor : 6371;
    let deltaF = (f2 - f1) * toRadian;
    let deltaL = (l2 - l1) * toRadian;
    let a = Math.sin(deltaF / 2) * Math.sin(deltaF / 2) + Math.cos(f1 * toRadian) * Math.cos(f2 * toRadian) * Math.sin(deltaL / 2) * Math.sin(deltaL / 2);
    let c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    let distance = R * c;
    this._result = {
      Bearing: brng,
      Distance: distance
    };
  },
  _closePath: function _closePath(e) {
    this._map.removeLayer(this._tempLine);
    this._map.removeLayer(this._tempPoint);
    if (this._clickCount <= 1) {
      this._map.removeLayer(this._pointLayer);
    }
    this._map.scrollWheelZoom.enable();
    this._map.zoomControl.enable();
    if (this.options.measureArea && this._clickCount > 2) {
      let poly = _leaflet.default.polygon(this._clickedPoints, this.options.polyStyle);
      let area = this._calcArea(poly.getLatLngs()[0]) * this.options.areaUnit.factor;
      let text = "<b>".concat(this.options.areaUnit.label, "</b>&nbsp;").concat(area.toLocaleString("fa-IR", {
        maximumFractionDigits: this.options.areaUnit.decimal
      }), " ").concat(this.options.areaUnit.display);
      this._polyLayer = _leaflet.default.featureGroup().addTo(this._allLayers);
      poly.bindTooltip(text, {
        permanent: true,
        direction: "top",
        className: "leaflet-ruler__result-area-tooltip"
      }).addTo(this._polyLayer).openTooltip();
    }
    _leaflet.default.DomEvent.off(this._container, "click", this._closePathAndToggleMeasure, this);
    _leaflet.default.DomEvent.on(this._container, "click", this._toggleMeasure, this);
    this._active = false;
    this._toggleMeasure();
    if (e) {
      e.preventDefault();
    }
  },
  _closePathAndToggleMeasure(e) {
    this._closePath(e);
    this._active = true;
    this._toggleMeasure();
  },
  _calcArea: function _calcArea(latLngs) {
    let pointsNum = latLngs.length;
    let area = 0;
    let d2r = Math.PI / 180;
    let p1;
    let p2;
    if (pointsNum > 2) {
      for (let i = 0; i < pointsNum; i++) {
        p1 = latLngs[i];
        p2 = latLngs[(i + 1) % pointsNum];
        area += (p2.lng - p1.lng) * d2r * (2 + Math.sin(p1.lat * d2r) + Math.sin(p2.lat * d2r));
      }
      area = area * 6378137.0 * 6378137.0 / 2.0;
    }
    return Math.abs(area);
  }
});
_leaflet.default.control.ruler = function (options) {
  return new _leaflet.default.Control.Ruler(options);
};
