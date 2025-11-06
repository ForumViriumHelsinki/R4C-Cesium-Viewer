import { describe, it, expect, beforeEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { createVuetify } from "vuetify";
import * as components from "vuetify/components";
import * as directives from "vuetify/directives";
import ClimateAdaption from "../../../src/components/ClimateAdaption.vue";
import { createPinia } from "pinia";

// Mock child components
vi.mock("../../../src/components/CoolingCenter.vue", () => ({
  default: {
    name: "CoolingCenter",
    template: '<div class="mock-cooling-center">Cooling Center Component</div>',
  },
}));

vi.mock("../../../src/components/CoolingCenterOptimiser.vue", () => ({
  default: {
    name: "CoolingCenterOptimiser",
    template:
      '<div class="mock-cooling-center-optimiser">Cooling Center Optimiser Component</div>',
  },
}));

vi.mock("../../../src/components/EstimatedImpacts.vue", () => ({
  default: {
    name: "EstimatedImpacts",
    template:
      '<div class="mock-estimated-impacts">Estimated Impacts Component</div>',
  },
}));

vi.mock("../../../src/components/LandcoverToParks.vue", () => ({
  default: {
    name: "LandcoverToParks",
    template:
      '<div class="mock-landcover-to-parks">Landcover To Parks Component</div>',
  },
}));

describe("ClimateAdaption Component", () => {
  let wrapper;
  let vuetify;
  let pinia;

  // Helper to mount with VApp wrapper - properly provides layout context
  const mountWithVApp = (props = {}) => {
    const VApp = components.VApp;
    const wrapper = mount(
      {
        template: '<v-app><climate-adaption v-bind="$props" /></v-app>',
        components: { VApp, ClimateAdaption },
        props: Object.keys(props),
      },
      {
        props,
        global: {
          plugins: [vuetify, pinia],
        },
      },
    );
    // Return wrapper with helper to get child component
    wrapper.getComponent = () => wrapper.findComponent(ClimateAdaption);
    return wrapper;
  };

  beforeEach(() => {
    vuetify = createVuetify({
      components,
      directives,
    });
    pinia = createPinia();
  });

  describe("Component Mounting and Props", () => {
    it("should mount successfully", () => {
      wrapper = mountWithVApp({ modelValue: false });
      expect(wrapper.findComponent(ClimateAdaption).exists()).toBe(true);
    });

    it("should accept modelValue prop", () => {
      wrapper = mountWithVApp({ modelValue: true });
      const component = wrapper.findComponent(ClimateAdaption);
      expect(component.props("modelValue")).toBe(true);
    });

    it("should render navigation drawer when modelValue is true", async () => {
      wrapper = mountWithVApp({ modelValue: true });
      await wrapper.vm.$nextTick();
      const drawer = wrapper.find(".v-navigation-drawer");
      expect(drawer.exists()).toBe(true);
    });

    it("should not render navigation drawer when modelValue is false", () => {
      wrapper = mountWithVApp({ modelValue: false });
      const drawer = wrapper.find(".v-navigation-drawer");
      expect(drawer.exists()).toBe(false);
    });
  });

  describe("Tab Navigation", () => {
    beforeEach(() => {
      wrapper = mountWithVApp({ modelValue: true });
    });

    it("should display all three tabs", () => {
      const tabs = wrapper.findAll(".v-tab");
      expect(tabs).toHaveLength(3);
      expect(tabs[0].text()).toBe("Cooling Centers");
      expect(tabs[1].text()).toBe("Optimizer");
      expect(tabs[2].text()).toBe("Green Spaces");
    });

    it("should default to centers tab", () => {
      const component = wrapper.findComponent(ClimateAdaption);
      expect(component.vm.tab).toBe("centers");
    });

    it("should switch tabs when clicked", async () => {
      const component = wrapper.findComponent(ClimateAdaption);
      const tabs = wrapper.findAll(".v-tab");
      await tabs[1].trigger("click");
      await wrapper.vm.$nextTick();
      expect(component.vm.tab).toBe("optimizer");
    });

    it("should render correct content for centers tab", async () => {
      const component = wrapper.findComponent(ClimateAdaption);
      component.vm.tab = "centers";
      await wrapper.vm.$nextTick();
      const content = wrapper.find(".mock-cooling-center");
      expect(content.exists()).toBe(true);
    });

    it("should render correct content for optimizer tab", async () => {
      const component = wrapper.findComponent(ClimateAdaption);
      component.vm.tab = "optimizer";
      await wrapper.vm.$nextTick();
      const content = wrapper.find(".mock-cooling-center-optimiser");
      expect(content.exists()).toBe(true);
    });

    it("should render correct content for parks tab", async () => {
      const component = wrapper.findComponent(ClimateAdaption);
      component.vm.tab = "parks";
      await wrapper.vm.$nextTick();
      const content = wrapper.find(".mock-landcover-to-parks");
      expect(content.exists()).toBe(true);
    });
  });

  describe("V-Model Synchronization", () => {
    it("should emit update:modelValue when drawer is closed", async () => {
      wrapper = mountWithVApp({ modelValue: true });
      const component = wrapper.getComponent();

      // Find close button by component type and aria-label
      const closeButton = wrapper.findComponent({
        name: "VBtn",
        props: { icon: "mdi-close" },
      });
      await closeButton.trigger("click");

      expect(component.emitted("update:modelValue")).toBeTruthy();
      expect(component.emitted("update:modelValue")[0]).toEqual([false]);
    });

    it("should sync internal state when prop changes", async () => {
      wrapper = mountWithVApp({ modelValue: false });
      const component = wrapper.getComponent();

      expect(component.vm.drawerOpen).toBe(false);

      await wrapper.setProps({ modelValue: true });
      await wrapper.vm.$nextTick();

      expect(component.vm.drawerOpen).toBe(true);
    });

    it("should emit when value changes via computed setter", async () => {
      wrapper = mountWithVApp({ modelValue: true });
      const component = wrapper.getComponent();

      // The computed property setter will emit when value changes
      component.vm.drawerOpen = false;
      await wrapper.vm.$nextTick();

      expect(component.emitted("update:modelValue")).toBeTruthy();
      expect(component.emitted("update:modelValue")[0]).toEqual([false]);

      // Setting back to true should also emit
      component.vm.drawerOpen = true;
      await wrapper.vm.$nextTick();

      expect(component.emitted("update:modelValue")).toHaveLength(2);
      expect(component.emitted("update:modelValue")[1]).toEqual([true]);
    });
  });

  describe("Component Layout and Structure", () => {
    beforeEach(() => {
      wrapper = mountWithVApp({ modelValue: true });
    });

    it("should have correct drawer width", () => {
      const drawer = wrapper.findComponent({ name: "VNavigationDrawer" });
      // Vuetify converts width to string
      expect(drawer.props("width")).toBe("300");
    });

    it("should have temporary drawer behavior", () => {
      const drawer = wrapper.findComponent({ name: "VNavigationDrawer" });
      expect(drawer.props("temporary")).toBe(true);
    });

    it("should display header with icon and title", () => {
      const title = wrapper.find(".v-card-title");
      expect(title.text()).toContain("Climate Adaptation");
      const icon = title.find(".v-icon");
      expect(icon.exists()).toBe(true);
    });

    it("should always render EstimatedImpacts component", () => {
      const impacts = wrapper.find(".mock-estimated-impacts");
      expect(impacts.exists()).toBe(true);
    });
  });

  describe("Close Button Functionality", () => {
    beforeEach(() => {
      wrapper = mountWithVApp({ modelValue: true });
    });

    it("should have a close button", () => {
      const closeButton = wrapper.findComponent({
        name: "VBtn",
        props: { icon: "mdi-close" },
      });
      expect(closeButton.exists()).toBe(true);
    });

    it("should close drawer when close button is clicked", async () => {
      const component = wrapper.getComponent();

      // Verify drawer is open initially
      expect(component.vm.drawerOpen).toBe(true);

      // Click the close button by finding it via aria-label
      const buttons = wrapper.findAllComponents({ name: "VBtn" });
      const closeButton = buttons.find((btn) =>
        btn.attributes("aria-label")?.includes("Close"),
      );

      expect(closeButton).toBeTruthy();
      await closeButton.trigger("click");
      await wrapper.vm.$nextTick();

      // The computed property getter returns the prop value, so we verify
      // the component emitted the update event (which parent would handle)
      expect(component.emitted("update:modelValue")).toBeTruthy();
      expect(component.emitted("update:modelValue")[0]).toEqual([false]);

      // Simulate parent updating the prop (like it would in real usage)
      await wrapper.setProps({ modelValue: false });
      await wrapper.vm.$nextTick();
      expect(component.vm.drawerOpen).toBe(false);
    });
  });

  describe("CSS Classes and Styles", () => {
    beforeEach(() => {
      wrapper = mountWithVApp({ modelValue: true });
    });

    it("should apply climate-adaption-panel class to drawer", () => {
      const drawer = wrapper.find(".climate-adaption-panel");
      expect(drawer.exists()).toBe(true);
    });

    it("should apply correct styles to card", () => {
      const card = wrapper.find(".v-card");
      expect(card.attributes("style")).toContain("height: 100%");
    });

    it("should apply scrollable content area", () => {
      const content = wrapper.find(".v-card-text");
      expect(content.classes()).toContain("overflow-y-auto");
      expect(content.classes()).toContain("flex-grow-1");
    });
  });

  describe("Edge Cases", () => {
    it("should handle rapid prop changes gracefully", async () => {
      wrapper = mountWithVApp({ modelValue: false });
      const component = wrapper.getComponent();

      // Rapidly change props
      await wrapper.setProps({ modelValue: true });
      await wrapper.setProps({ modelValue: false });
      await wrapper.setProps({ modelValue: true });
      await wrapper.vm.$nextTick();

      expect(component.vm.drawerOpen).toBe(true);
      expect(wrapper.find(".v-navigation-drawer").exists()).toBe(true);
    });

    it("should maintain tab state when drawer closes and reopens", async () => {
      wrapper = mountWithVApp({ modelValue: true });
      const component = wrapper.getComponent();

      // Change to optimizer tab
      component.vm.tab = "optimizer";
      await wrapper.vm.$nextTick();

      // Close drawer
      await wrapper.setProps({ modelValue: false });
      await wrapper.vm.$nextTick();

      // Reopen drawer
      await wrapper.setProps({ modelValue: true });
      await wrapper.vm.$nextTick();

      // Tab should still be optimizer
      expect(component.vm.tab).toBe("optimizer");
    });
  });
});
